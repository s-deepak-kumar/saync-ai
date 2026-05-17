import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Database } from 'bun:sqlite';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

// Export type alias for the database
export type SayncDb = ReturnType<typeof drizzle<typeof schema>>;

let db: SayncDb | null = null;
let sqlite: Database | null = null;
let currentDbPath: string | null = null;

/**
 * Create or get existing database connection
 * @param dbPath - Optional custom database path. Defaults to .saync/saync.db in current working directory
 *
 * NOTE: This function uses a singleton pattern. Once initialized, subsequent calls with a different
 * dbPath will throw an error. Call closeDb() first if you need to switch database paths.
 */
export async function getDb(dbPath?: string): Promise<SayncDb> {
  // If already initialized and no path specified, return existing connection
  if (db && !dbPath) {
    return db;
  }
  
  // Default to .saync/saync.db in current working directory
  const finalPath = dbPath || resolve(process.cwd(), '.saync/saync.db');
  
  // If already initialized with a path, verify it matches
  if (db) {
    if (currentDbPath !== finalPath) {
      throw new Error(
        `Database already initialized with path '${currentDbPath}'. ` +
        `Cannot reinitialize with '${finalPath}'. Call closeDb() first.`
      );
    }
    return db;
  }
  
  // Ensure parent directory exists
  const dir = dirname(finalPath);
  await mkdir(dir, { recursive: true });
  
  // Create SQLite connection using Bun's native driver
  sqlite = new Database(finalPath);
  currentDbPath = finalPath;
  
  // Enable foreign keys
  sqlite.exec('PRAGMA foreign_keys = ON;');
  
  // Create Drizzle instance
  db = drizzle(sqlite, { schema });
  
  // Run migrations automatically
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(__dirname, '../../drizzle');
  await migrate(db, { migrationsFolder });
  
  return db;
}

/**
 * Close database connection (for testing/cleanup)
 * Properly closes the underlying SQLite handle and resets the singleton
 */
export function closeDb() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
  db = null;
  currentDbPath = null;
}

// Made with Bob
