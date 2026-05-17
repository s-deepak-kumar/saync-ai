/**
 * Polls the user's app URL to surface connected/disconnected state to
 * the dashboard. Writes the result into a small file so the running
 * Next process can pick it up without IPC.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * @param {string} appUrl
 * @param {string} statusFile
 * @returns {() => void} stop function
 */
export function startAppProbe(appUrl, statusFile) {
  mkdirSync(dirname(statusFile), { recursive: true });

  const tick = async () => {
    try {
      const res = await fetch(appUrl, {
        signal: AbortSignal.timeout(1500),
        // Some apps return 404 at /; we treat any HTTP response as alive.
      });
      writeFileSync(statusFile, JSON.stringify({
        connected: true,
        statusCode: res.status,
        checkedAt: new Date().toISOString(),
      }));
    } catch {
      writeFileSync(statusFile, JSON.stringify({
        connected: false,
        statusCode: null,
        checkedAt: new Date().toISOString(),
      }));
    }
  };

  tick();
  const id = setInterval(tick, 3000);
  return () => clearInterval(id);
}
