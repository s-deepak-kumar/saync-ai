import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, asc, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { flows, flowStepResults } from '@/lib/db/schema';
import { pubsub } from '@/lib/pubsub';

export const dynamic = 'force-dynamic';

const flowStepSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  kind: z.enum(['interact', 'fill', 'select', 'expect', 'wait']),
  status: z.enum(['passed', 'failed', 'skipped']),
  errorMessage: z.string().optional(),
  screenshot: z.string().optional(),
});

const postFlowSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['passed', 'failed']),
  durationMs: z.number().int().nonnegative(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  steps: z.array(flowStepSchema),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = postFlowSchema.parse(await req.json());
  const runId = params.id;
  const db = getDb();
  const flowId = crypto.randomUUID();
  const now = new Date();

  await db.insert(flows).values({
    id: flowId,
    runId,
    name: body.name,
    status: body.status,
    durationMs: body.durationMs,
    startedAt: new Date(body.startedAt),
    completedAt: new Date(body.completedAt),
    createdAt: now,
  });

  if (body.steps.length > 0) {
    await db.insert(flowStepResults).values(
      body.steps.map((step) => ({
        id: crypto.randomUUID(),
        flowId,
        stepIndex: step.stepIndex,
        kind: step.kind,
        status: step.status,
        errorMessage: step.errorMessage ?? null,
        screenshot: step.screenshot ?? null,
        createdAt: now,
      })),
    );
  }

  pubsub.publish(runId, 'flow-complete', {
    flowId,
    name: body.name,
    status: body.status,
    stepCount: body.steps.length,
  });

  return NextResponse.json({ flowId }, { status: 201 });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = getDb();
  const flowRows = await db.query.flows.findMany({
    where: eq(flows.runId, params.id),
    orderBy: [asc(flows.startedAt)],
  });
  if (flowRows.length === 0) return NextResponse.json([]);

  const allSteps = await db.query.flowStepResults.findMany({
    where: inArray(flowStepResults.flowId, flowRows.map((f) => f.id)),
    orderBy: [asc(flowStepResults.stepIndex)],
  });

  return NextResponse.json(
    flowRows.map((f) => ({
      ...f,
      steps: allSteps.filter((s) => s.flowId === f.id),
    })),
  );
}
