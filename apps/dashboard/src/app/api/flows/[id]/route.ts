import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { flows, flowStepResults } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const flow = await db.query.flows.findFirst({ where: eq(flows.id, params.id) });
  if (!flow) return NextResponse.json({ error: 'Flow not found' }, { status: 404 });

  const steps = await db.query.flowStepResults.findMany({
    where: eq(flowStepResults.flowId, params.id),
    orderBy: [asc(flowStepResults.stepIndex)],
  });

  return NextResponse.json({ ...flow, steps });
}
