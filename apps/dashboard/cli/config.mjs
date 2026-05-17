/**
 * Loads the user's optional `saync.config.ts` (or .js / .mjs) from
 * their project root. Returns sane defaults if nothing's there.
 *
 * Resolved values flow back into env vars before `next start` boots,
 * so server components + Route Handlers can read them without an
 * extra IPC channel.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createJiti } from 'jiti';

/**
 * @typedef {{
 *   appUrl: string,
 *   port: number,
 *   watch: string[],
 *   mode: 'local' | 'dev' | 'prod',
 *   dbPath: string,
 * }} ResolvedConfig
 */

const DEFAULTS = {
  appUrl: 'http://localhost:3000',
  port: 3777,
  watch: ['src/**/*.{ts,tsx,js,jsx}'],
  mode: 'local',
  dbPath: '.saync/saync.db',
};

const CANDIDATE_FILES = [
  'saync.config.ts',
  'saync.config.mts',
  'saync.config.js',
  'saync.config.mjs',
];

/**
 * Load + normalize saync.config.* from `cwd`. Honors env-var overrides
 * for any field — env wins over config file wins over defaults.
 *
 * @param {string} cwd
 * @returns {Promise<ResolvedConfig>}
 */
export async function loadConfig(cwd) {
  let fileCfg = {};
  for (const name of CANDIDATE_FILES) {
    const fullPath = resolve(cwd, name);
    if (existsSync(fullPath)) {
      const jiti = createJiti(cwd + '/', { interopDefault: true });
      try {
        const mod = await jiti.import(fullPath);
        fileCfg = mod?.default ?? mod ?? {};
      } catch (err) {
        console.error(`[saync] failed to load ${name}:`, err);
      }
      break;
    }
  }

  const envMode = process.env.SAYNC_MODE;
  const envPort = process.env.SAYNC_PORT;
  const envAppUrl = process.env.SAYNC_APP_URL;
  const envDbPath = process.env.SAYNC_DB_PATH;

  return {
    appUrl: envAppUrl ?? fileCfg.appUrl ?? DEFAULTS.appUrl,
    port: envPort ? Number(envPort) : (fileCfg.port ?? DEFAULTS.port),
    watch: Array.isArray(fileCfg.watch) ? fileCfg.watch : DEFAULTS.watch,
    mode: (envMode ?? fileCfg.mode ?? DEFAULTS.mode),
    dbPath: envDbPath ?? fileCfg.dbPath ?? DEFAULTS.dbPath,
  };
}
