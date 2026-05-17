/**
 * File watcher for local mode. Re-runs the agent (one-shot) on
 * debounced changes. Skips re-runs while one is already in flight so
 * the queue doesn't pile up on the user.
 */

import chokidar from 'chokidar';

/**
 * @param {string[]} patterns
 * @param {() => Promise<void> | void} onChange
 * @returns {() => Promise<void>}
 */
export function startWatcher(patterns, onChange) {
  const watcher = chokidar.watch(patterns, {
    ignored: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.saync/**'],
    ignoreInitial: true,
    persistent: true,
  });

  let scheduled = false;
  let running = false;

  const runSoon = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(async () => {
      scheduled = false;
      if (running) {
        // Another change came in mid-run — schedule again so we don't
        // drop the latest edit on the floor.
        runSoon();
        return;
      }
      running = true;
      try { await onChange(); } finally { running = false; }
    }, 500);
  };

  watcher.on('add', runSoon).on('change', runSoon).on('unlink', runSoon);

  return async () => { await watcher.close(); };
}
