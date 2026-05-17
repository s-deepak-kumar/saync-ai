import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/connection';
import {
  runs,
  contractResults,
  issues,
  issueOccurrences,
  flows,
  flowStepResults,
  productionViolations,
} from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * POST /api/clear — admin action: wipe all per-project Saync data.
 * Cascades drop most rows, but we delete in dependency order so the FK
 * cascade can't surprise us when WAL is involved.
 */
export async function POST() {
  const db = getDb();
  db.delete(flowStepResults).run();
  db.delete(flows).run();
  db.delete(issueOccurrences).run();
  db.delete(issues).run();
  db.delete(contractResults).run();
  db.delete(runs).run();
  db.delete(productionViolations).run();
  return NextResponse.json({ ok: true });
}
