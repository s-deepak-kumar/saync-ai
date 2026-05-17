import { getDb, closeDb } from './db/connection.js';
import { cleanupOldRuns } from './db/cleanup.js';
import { createApp } from './app.js';

export interface StartBackendOptions {
  port?: number;
  embedded?: boolean;
  dbPath?: string;
}

export interface BackendHandle {
  stop: () => Promise<void>;
  port: number;
  url: string;
}

/**
 * Check if a Saync backend is already running on the given port
 * Returns true if our backend is running, false if port is free
 * Throws if port is occupied by a non-Saync service
 */
async function checkPortAvailability(port: number): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(`http://localhost:${port}/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'ok') {
        // Our backend is already running
        return true;
      }
    }
    
    // Port is occupied by a non-Saync service
    throw new Error(
      `Port ${port} is occupied by a non-Saync service. ` +
      `Set SAYNC_PORT environment variable to use a different port.`
    );
  } catch (error: any) {
    // Connection refused or timeout means port is free
    // Bun uses error.code === 'ConnectionRefused' or 'ECONNREFUSED'
    if (
      error.name === 'AbortError' ||
      error.code === 'ConnectionRefused' ||
      error.code === 'ECONNREFUSED' ||
      error.cause?.code === 'ECONNREFUSED' ||
      error.cause?.code === 'ConnectionRefused'
    ) {
      return false;
    }
    // Re-throw our custom error about non-Saync service
    throw error;
  }
}

/**
 * Start the Saync backend server
 * Can run in standalone mode (blocks) or embedded mode (non-blocking)
 * 
 * If the backend is already running on the specified port, returns a handle
 * to the existing instance (with stop() as a no-op).
 */
export async function startBackend(options: StartBackendOptions = {}): Promise<BackendHandle> {
  const { port = 4000, embedded = false, dbPath } = options;
  const url = `http://localhost:${port}`;
  
  // Check if backend is already running on this port
  const isRunning = await checkPortAvailability(port);
  
  if (isRunning) {
    console.log(`✓ Backend already running at ${url}`);
    console.log(`  Returning handle to existing instance`);
    
    // Return handle to existing instance with no-op stop
    return {
      stop: async () => {
        console.log('  (stop() is a no-op for existing instance)');
      },
      port,
      url,
    };
  }
  
  // Initialize database connection (this sets up the singleton)
  await getDb(dbPath);
  
  // Run auto-cleanup on startup (uses the already-initialized connection)
  await cleanupOldRuns();
  
  // Create Hono app
  const app = createApp();
  
  console.log(`✓ Backend initialized`);
  console.log(`  Database: ${dbPath || '.saync/saync.db'}`);
  console.log(`  Port: ${port}`);
  console.log(`  Mode: ${embedded ? 'embedded' : 'standalone'}`);
  
  // Start server and capture the server instance
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });
  
  console.log(`✓ Backend listening on ${url}`);
  
  // Return handle with proper stop function
  return {
    stop: async () => {
      console.log(`Stopping backend on port ${port}...`);
      server.stop(true); // Force close
      closeDb();
      // Give server a moment to fully stop
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`✓ Backend stopped`);
    },
    port,
    url,
  };
}

// If run directly (not imported), start in standalone mode
if (import.meta.main) {
  await startBackend({ port: 4000, embedded: false });
}

// Made with Bob
