import { NextResponse } from 'next/server';
import { eq, asc, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs, contractResults, flows, flowStepResults } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const run = await db.query.runs.findFirst({ where: eq(runs.id, params.id) });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const results = await db.query.contractResults.findMany({
    where: eq(contractResults.runId, params.id),
    orderBy: [asc(contractResults.createdAt)],
  });

  const runFlows = await db.query.flows.findMany({
    where: eq(flows.runId, params.id),
    orderBy: [asc(flows.startedAt)],
  });
  const flowSteps = runFlows.length > 0
    ? await db.query.flowStepResults.findMany({
        where: inArray(flowStepResults.flowId, runFlows.map((f) => f.id)),
        orderBy: [asc(flowStepResults.stepIndex)],
      })
    : [];
  const flowsWithSteps = runFlows.map((f) => ({
    ...f,
    steps: flowSteps.filter((s) => s.flowId === f.id),
  }));

  return NextResponse.json({ ...run, results, flows: flowsWithSteps });
}
