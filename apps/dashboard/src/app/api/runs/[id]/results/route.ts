import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import {
  runs,
  contractResults,
  issues,
  issueOccurrences,
} from '@/lib/db/schema';
import { generateIssueHash } from '@/lib/hash';
import { pubsub } from '@/lib/pubsub';

export const dynamic = 'force-dynamic';

const postResultSchema = z.object({
  contractName: z.string().min(1),
  componentName: z.string().min(1),
  status: z.enum(['pass', 'fail', 'warn']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
  errorMessage: z.string().optional(),
  expectedValue: z.string().optional(),
  observedValue: z.string().optional(),
  filePath: z.string().optional(),
  lineNumber: z.number().int().optional(),
  stackTrace: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = postResultSchema.parse(await req.json());
  const runId = params.id;
  const db = getDb();

  const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const resultId = crypto.randomUUID();
  const now = new Date();

  await db.insert(contractResults).values({
    id: resultId,
    runId,
    contractName: body.contractName,
    componentName: body.componentName,
    status: body.status,
    startedAt: new Date(body.startedAt),
    completedAt: new Date(body.completedAt),
    errorMessage: body.errorMessage ?? null,
    expectedValue: body.expectedValue ?? null,
    observedValue: body.observedValue ?? null,
    filePath: body.filePath ?? null,
    lineNumber: body.lineNumber ?? null,
    stackTrace: body.stackTrace ?? null,
    createdAt: now,
  });

  let newPassed = run.passedContracts;
  let newFailed = run.failedContracts;
  if (body.status === 'pass') {
    newPassed += 1;
    await db.update(runs).set({ passedContracts: sql`${runs.passedContracts} + 1` }).where(eq(runs.id, runId));
  } else if (body.status === 'fail') {
    newFailed += 1;
    await db.update(runs).set({ failedContracts: sql`${runs.failedContracts} + 1` }).where(eq(runs.id, runId));
  }

  let issueId: string | undefined;
  if (body.status === 'fail' && body.errorMessage) {
    const dedupHash = generateIssueHash(body.contractName, body.errorMessage);
    const newIssueId = crypto.randomUUID();

    const upsert = await db
      .insert(issues)
      .values({
        id: newIssueId,
        contractName: body.contractName,
        componentName: body.componentName,
        errorMessage: body.errorMessage,
        status: 'open',
        severity: 'medium',
        firstSeenAt: now,
        lastSeenAt: now,
        occurrenceCount: 1,
        dedupHash,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: issues.dedupHash,
        set: {
          lastSeenAt: now,
          occurrenceCount: sql`${issues.occurrenceCount} + 1`,
        },
      })
      .returning({ id: issues.id });

    issueId = upsert[0].id;

    await db.insert(issueOccurrences).values({
      id: crypto.randomUUID(),
      issueId,
      runId,
      resultId,
      occurredAt: now,
      createdAt: now,
    });
  }

  pubsub.publish(runId, 'result', {
    contractResult: {
      id: resultId,
      runId,
      contractName: body.contractName,
      componentName: body.componentName,
      status: body.status,
      startedAt: new Date(body.startedAt),
      completedAt: new Date(body.completedAt),
      errorMessage: body.errorMessage ?? null,
      expectedValue: body.expectedValue ?? null,
      observedValue: body.observedValue ?? null,
      filePath: body.filePath ?? null,
      lineNumber: body.lineNumber ?? null,
      stackTrace: body.stackTrace ?? null,
      createdAt: now,
    },
  });

  pubsub.publish(runId, 'progress', {
    passed: newPassed,
    failed: newFailed,
    total: run.totalContracts,
  });

  return NextResponse.json({ resultId, issueId }, { status: 201 });
}
