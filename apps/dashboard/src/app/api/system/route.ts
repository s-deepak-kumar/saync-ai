import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'node:fs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system — small JSON used by the sidebar to show mode + the
 * "app connected" dot. The CLI writes a tiny JSON file every few
 * seconds (see cli/probe.mjs); we read whichever value's freshest.
 */
export async function GET() {
  const mode = (process.env.SAYNC_MODE ?? 'local') as 'local' | 'dev' | 'prod';

  let appConnected: boolean | null = null;
  let appStatusCode: number | null = null;
  let checkedAt: string | null = null;

  const statusFile = process.env.SAYNC_APP_STATUS_FILE;
  if (statusFile && existsSync(statusFile)) {
    try {
      const data = JSON.parse(readFileSync(statusFile, 'utf8'));
      appConnected = Boolean(data.connected);
      appStatusCode = data.statusCode ?? null;
      checkedAt = data.checkedAt ?? null;
    } catch { /* stale write — leave nulls */ }
  }

  return NextResponse.json({
    mode,
    appConnected,
    appStatusCode,
    appUrl: process.env.SAYNC_APP_URL ?? null,
    dbPath: process.env.SAYNC_DB_PATH ?? '.saync/saync.db',
    checkedAt,
  });
}
