import { NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs, flows } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/flows — aggregated flow summary. One row per unique flow name,
 * most recent occurrence first, with totalRuns / passedRuns counts.
 */
export async function GET() {
  const db = getDb();
  const recentRuns = await db.query.runs.findMany({
    orderBy: [desc(runs.startedAt)],
    limit: 50,
  });
  if (recentRuns.length === 0) return NextResponse.json([]);

  const allFlows = await db.query.flows.findMany({
    where: inArray(flows.runId, recentRuns.map((r) => r.id)),
    orderBy: [desc(flows.startedAt)],
  });

  const stats = new Map<string, { totalRuns: number; passedRuns: number }>();
  for (const f of allFlows) {
    const s = stats.get(f.name) ?? { totalRuns: 0, passedRuns: 0 };
    s.totalRuns += 1;
    if (f.status === 'passed') s.passedRuns += 1;
    stats.set(f.name, s);
  }

  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const f of allFlows) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    const s = stats.get(f.name)!;
    out.push({ ...f, totalRuns: s.totalRuns, passedRuns: s.passedRuns });
  }
  return NextResponse.json(out);
}
