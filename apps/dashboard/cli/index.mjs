/**
 * Saync CLI — single-binary entrypoint for the local-first model.
 *
 *   saync start  — boot the Saync server, app probe, and (in local
 *                  mode) a file watcher that re-runs the agent on
 *                  every save.
 *   saync run    — one-shot agent invocation. Used by build hooks
 *                  in dev / prod modes.
 *   saync clear  — wipe the local DB (with confirm prompt).
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync, unlinkSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { loadConfig } from './config.mjs';
import { startAppProbe } from './probe.mjs';
import { startWatcher } from './watcher.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DASHBOARD_ROOT = resolve(__dirname, '..');

function help() {
  console.log(`
Saync — verify what your app should do, locally.

Usage:
  saync <command> [options]

Commands:
  start       Boot the Saync server (dashboard + API + watcher)
  run         Run the agent once against your app URL
  clear       Wipe all locally-stored Saync data
  help        Show this message

Env vars:
  SAYNC_MODE      'local' | 'dev' | 'prod'  (default: local)
  SAYNC_PORT      Saync server port           (default: 3777)
  SAYNC_APP_URL   Your app's URL              (default: http://localhost:3000)
  SAYNC_DB_PATH   Where to store the DB       (default: .saync/saync.db)

Or use a saync.config.ts at your project root.
`);
}

const sub = process.argv[2];

if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
  help();
  process.exit(0);
}

const cwd = process.cwd();
const config = await loadConfig(cwd);

if (sub === 'start') await cmdStart();
else if (sub === 'run') await cmdRun();
else if (sub === 'clear') await cmdClear();
else { console.error(`Unknown command: ${sub}`); help(); process.exit(1); }

/* ──────────────────────────────────────────────────────────── */

async function cmdStart() {
  console.log(`[saync] mode=${config.mode} port=${config.port} appUrl=${config.appUrl}`);
  console.log(`[saync] db=${resolve(cwd, config.dbPath)}`);

  const statusFile = resolve(cwd, '.saync/app-status.json');

  // Surface config to the Next process via env. The /api/system route
  // reads these at request time.
  const env = {
    ...process.env,
    SAYNC_MODE: config.mode,
    SAYNC_APP_URL: config.appUrl,
    SAYNC_DB_PATH: resolve(cwd, config.dbPath),
    SAYNC_APP_STATUS_FILE: statusFile,
    SAYNC_MIGRATIONS_FOLDER: resolve(DASHBOARD_ROOT, 'drizzle'),
    PORT: String(config.port),
  };

  // Two boot paths:
  //   - Published (.next/standalone/server.js exists): run the prebuilt
  //     server. This is the npm-install path — fast and self-contained.
  //   - Dev (workspace, no prebuilt server): fall back to `next dev`.
  const standaloneServer = resolve(DASHBOARD_ROOT, '.next/standalone/server.js');
  const nextBin = resolve(DASHBOARD_ROOT, 'node_modules/.bin/next');
  const nextProcess = existsSync(standaloneServer)
    ? spawn(process.execPath, [standaloneServer], {
        cwd: dirname(standaloneServer),
        env,
        stdio: 'inherit',
      })
    : spawn(nextBin, ['dev', '-p', String(config.port)], {
        cwd: DASHBOARD_ROOT,
        env,
        stdio: 'inherit',
      });

  const stopProbe = startAppProbe(config.appUrl, statusFile);

  let stopWatcher = () => {};
  if (config.mode === 'local') {
    stopWatcher = startWatcher(config.watch, async () => {
      console.log('[saync] change detected — running agent…');
      await runAgentOnce(env);
    });
  }

  const shutdown = async () => {
    console.log('\n[saync] shutting down…');
    stopProbe();
    await stopWatcher();
    nextProcess.kill('SIGTERM');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  nextProcess.on('exit', (code) => {
    stopProbe();
    process.exit(code ?? 0);
  });
}

async function cmdRun() {
  const env = {
    ...process.env,
    SAYNC_URL: `http://localhost:${config.port}`,
    SAYNC_MODE: config.mode,
  };
  await runAgentOnce(env);
}

async function cmdClear() {
  const dbPath = resolve(cwd, config.dbPath);
  if (!existsSync(dbPath)) {
    console.log(`[saync] nothing to clear: ${dbPath} does not exist.`);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Delete ${dbPath}? (y/N): `);
  rl.close();
  if (answer.trim().toLowerCase() !== 'y') {
    console.log('[saync] aborted.');
    return;
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const f = dbPath + suffix;
    if (existsSync(f)) unlinkSync(f);
  }
  console.log('[saync] cleared.');
}

/* ──────────────────────────────────────────────────────────── */

function runAgentOnce(env) {
  // Locate the @saync/agent binary that pnpm hoisted next to us.
  const agentBin =
    findBin('saync-agent', DASHBOARD_ROOT) ??
    findBin('saync-agent', cwd);
  if (!agentBin) {
    console.error('[saync] @saync/agent is not installed.');
    return Promise.resolve();
  }

  return new Promise((resolveP) => {
    const child = spawnSync(agentBin, [config.appUrl, '--environment', config.mode], {
      cwd,
      env,
      stdio: 'inherit',
    });
    if (child.status !== 0) {
      console.error(`[saync] agent exited with status ${child.status}`);
    }
    resolveP(undefined);
  });
}

function findBin(name, root) {
  const candidates = [
    resolve(root, 'node_modules/.bin', name),
    resolve(root, '../node_modules/.bin', name),
    resolve(root, '../../node_modules/.bin', name),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}
