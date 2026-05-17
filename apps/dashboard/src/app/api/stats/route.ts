import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs, issues, contractResults } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export async function GET() {
  const db = getDb();

  const openIssuesRow = await db
    .select({ count: sql<number>`count(*)`.as('count') })
    .from(issues)
    .where(eq(issues.status, 'open'));
  const openIssues = openIssuesRow[0]?.count ?? 0;

  const lastRun = await db.query.runs.findFirst({
    orderBy: [desc(runs.startedAt)],
  });

  const passRow = await db
    .select({
      pass: sql<number>`sum(case when ${contractResults.status} = 'pass' then 1 else 0 end)`.as('pass'),
      total: sql<number>`count(*)`.as('total'),
    })
    .from(contractResults);
  const total = passRow[0]?.total ?? 0;
  const pass = passRow[0]?.pass ?? 0;
  const passRate = total > 0 ? pass / total : 0;

  const totalContracts = lastRun?.totalContracts ?? 0;
  const lastRunDuration = lastRun && lastRun.startedAt && lastRun.completedAt
    ? formatMs(new Date(lastRun.completedAt).getTime() - new Date(lastRun.startedAt).getTime())
    : '—';

  return NextResponse.json({
    openIssues,
    totalContracts,
    passRate,
    lastRunDuration,
  });
}
