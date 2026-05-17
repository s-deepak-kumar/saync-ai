import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import * as schema from './schema';

export type SayncDb = BetterSQLite3Database<typeof schema>;

let _db: SayncDb | null = null;
let _sqlite: Database.Database | null = null;
let _dbPath: string | null = null;

/**
 * Resolve the DB path. Honors SAYNC_DB_PATH (absolute or relative to CWD);
 * otherwise drops the file at `.saync/saync.db` under the current working
 * directory — which is the user's project root when `saync start` runs.
 */
function resolveDbPath(): string {
  const fromEnv = process.env.SAYNC_DB_PATH;
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv);
  }
  return resolve(process.cwd(), '.saync/saync.db');
}

/**
 * Return the singleton Drizzle handle. Lazily opens the sqlite file and
 * runs pending migrations on first call. Idempotent.
 */
export function getDb(): SayncDb {
  if (_db) return _db;

  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  _sqlite = new Database(path);
  _sqlite.pragma('foreign_keys = ON');
  _sqlite.pragma('journal_mode = WAL');
  _dbPath = path;

  _db = drizzle(_sqlite, { schema });

  const migrationsFolder = process.env.SAYNC_MIGRATIONS_FOLDER ??
    resolve(process.cwd(), 'apps/dashboard/drizzle');
  try {
    migrate(_db, { migrationsFolder });
  } catch (err) {
    // First-boot in a fresh project may not have the migrations folder
    // bundled yet — bail loudly so we see it during dogfood.
    console.error('[saync] migration failed:', err);
    throw err;
  }

  return _db;
}

export function getDbPath(): string | null {
  return _dbPath;
}

export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
  }
  _db = null;
  _dbPath = null;
}
