import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import {
  generate,
  getLlmStatus,
  LlmConfigError,
  LlmRequestError,
} from '@/lib/llm';
import {
  issuePrompt,
  runPrompt,
  violationClusterPrompt,
  type ViolationClusterPayload,
} from '@/lib/llm/prompts';
import { getDb } from '@/lib/db/connection';
import {
  issues,
  issueOccurrences,
  runs,
  contractResults,
  flows,
  flowStepResults,
  productionViolations,
} from '@/lib/db/schema';
import { slugifyContract, looksLikeUuid } from '@/lib/slug';
import type {
  IssueDetail,
  RunDetail,
  FlowWithSteps,
} from '@/lib/api';

export const dynamic = 'force-dynamic';

const bodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('issue'),  issueId: z.string().min(1) }),
  z.object({ kind: z.literal('run'),    runId:   z.string().min(1) }),
  z.object({
    kind: z.literal('violation-cluster'),
    contractName:  z.string().min(1),
    componentName: z.string().min(1),
    errorMessage:  z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  // Status check first so we can return 503 with a friendly hint when
  // nothing's configured. This is by far the most common failure mode.
  const status = getLlmStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: 'No LLM provider configured.',
        hint: 'Set WATSONX_API_KEY+WATSONX_PROJECT_ID, OPENAI_API_KEY, or ANTHROPIC_API_KEY in your .env, then restart `saync start`.',
      },
      { status: 503 },
    );
  }

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request body', detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  try {
    let prompt;
    if (body.kind === 'issue') {
      const issue = await loadIssueDetail(body.issueId);
      if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
      prompt = issuePrompt(issue);
    } else if (body.kind === 'run') {
      const run = await loadRunDetail(body.runId);
      if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      prompt = runPrompt(run);
    } else {
      const cluster = await loadViolationCluster(body.contractName, body.componentName, body.errorMessage);
      if (!cluster) return NextResponse.json({ error: 'No matching violations' }, { status: 404 });
      prompt = violationClusterPrompt(cluster);
    }

    const result = await generate(prompt);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LlmConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof LlmRequestError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 502 },
      );
    }
    console.error('[llm/generate] unexpected error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/* ────────────────────────────────────────────────────────────── */
/*  Loaders — mirror the dashboard's GET endpoints so the LLM     */
/*  sees the exact data the user is looking at.                   */
/* ────────────────────────────────────────────────────────────── */

async function loadIssueDetail(idOrSlug: string): Promise<IssueDetail | null> {
  const db = getDb();
  let issue = looksLikeUuid(idOrSlug)
    ? await db.query.issues.findFirst({ where: eq(issues.id, idOrSlug) })
    : undefined;
  if (!issue) {
    const candidates = await db.query.issues.findMany();
    issue = candidates.find((row) => slugifyContract(row.contractName) === idOrSlug);
  }
  if (!issue) return null;

  const occs = await db
    .select({
      id:                  issueOccurrences.id,
      occurredAt:          issueOccurrences.occurredAt,
      runId:               issueOccurrences.runId,
      resultId:            issueOccurrences.resultId,
      runStatus:           runs.status,
      runStartedAt:        runs.startedAt,
      runEnvironment:      runs.environment,
      runGitBranch:        runs.gitBranch,
      runGitCommit:        runs.gitCommit,
      resultFilePath:      contractResults.filePath,
      resultLineNumber:    contractResults.lineNumber,
      resultStackTrace:    contractResults.stackTrace,
      resultExpectedValue: contractResults.expectedValue,
      resultObservedValue: contractResults.observedValue,
      resultErrorMessage:  contractResults.errorMessage,
    })
    .from(issueOccurrences)
    .leftJoin(runs, eq(issueOccurrences.runId, runs.id))
    .leftJoin(contractResults, eq(issueOccurrences.resultId, contractResults.id))
    .where(eq(issueOccurrences.issueId, issue.id))
    .orderBy(desc(issueOccurrences.occurredAt))
    .limit(10);

  return {
    ...issue,
    occurrences: occs.map((o) => ({
      ...o,
      occurredAt: o.occurredAt instanceof Date ? o.occurredAt.toISOString() : (o.occurredAt as unknown as string),
      runStartedAt: o.runStartedAt instanceof Date
        ? o.runStartedAt.toISOString()
        : (o.runStartedAt as unknown as string | null),
    })) as IssueDetail['occurrences'],
    firstSeenAt: issue.firstSeenAt instanceof Date ? issue.firstSeenAt.toISOString() : String(issue.firstSeenAt),
    lastSeenAt:  issue.lastSeenAt  instanceof Date ? issue.lastSeenAt.toISOString()  : String(issue.lastSeenAt),
  } as IssueDetail;
}

async function loadRunDetail(runId: string): Promise<RunDetail | null> {
  const db = getDb();
  const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
  if (!run) return null;

  const results = await db.query.contractResults.findMany({
    where: eq(contractResults.runId, runId),
    orderBy: [desc(contractResults.createdAt)],
  });
  const runFlows = await db.query.flows.findMany({
    where: eq(flows.runId, runId),
    orderBy: [desc(flows.startedAt)],
  });
  const steps = runFlows.length > 0
    ? await db.query.flowStepResults.findMany({
        where: (s, { inArray }) => inArray(s.flowId, runFlows.map((f) => f.id)),
        orderBy: [desc(flowStepResults.stepIndex)],
      })
    : [];

  const flowsWithSteps: FlowWithSteps[] = runFlows.map((f) => ({
    ...f,
    startedAt:   f.startedAt instanceof Date ? f.startedAt.toISOString() : String(f.startedAt),
    completedAt: f.completedAt instanceof Date ? f.completedAt.toISOString() : String(f.completedAt),
    createdAt:   f.createdAt instanceof Date ? f.createdAt.toISOString() : String(f.createdAt),
    status: f.status as FlowWithSteps['status'],
    steps: steps.filter((s) => s.flowId === f.id).map((s) => ({
      ...s,
      kind: s.kind as FlowWithSteps['steps'][number]['kind'],
      status: s.status as FlowWithSteps['steps'][number]['status'],
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
    })),
  }));

  return {
    ...run,
    startedAt:   run.startedAt instanceof Date ? run.startedAt.toISOString() : String(run.startedAt),
    completedAt: run.completedAt
      ? (run.completedAt instanceof Date ? run.completedAt.toISOString() : String(run.completedAt))
      : null,
    status: run.status as RunDetail['status'],
    results: results.map((r) => ({
      ...r,
      startedAt:   r.startedAt instanceof Date ? r.startedAt.toISOString() : String(r.startedAt),
      completedAt: r.completedAt instanceof Date ? r.completedAt.toISOString() : String(r.completedAt),
      status: r.status as RunDetail['results'][number]['status'],
    })) as RunDetail['results'],
    flows: flowsWithSteps,
  };
}

async function loadViolationCluster(
  contractName: string,
  componentName: string,
  errorMessage: string,
): Promise<ViolationClusterPayload | null> {
  const db = getDb();
  // Fetch every violation matching the triple. Bounded by the table size
  // in the local-first model — and clustering happens here, not in SQL.
  const rows = await db.query.productionViolations.findMany({
    where: (v, { and, eq }) => and(
      eq(v.contractName, contractName),
      eq(v.componentName, componentName),
      eq(v.errorMessage, errorMessage),
    ),
    orderBy: [desc(productionViolations.timestamp)],
    limit: 2000,
  });
  if (rows.length === 0) return null;

  const sessions = new Set(rows.map((r) => r.sessionId));
  const urlCounts = new Map<string, number>();
  const viewportCounts = new Map<string, { width: number; height: number; count: number }>();
  for (const r of rows) {
    urlCounts.set(r.url, (urlCounts.get(r.url) ?? 0) + 1);
    const key = `${r.viewportWidth}x${r.viewportHeight}`;
    const existing = viewportCounts.get(key);
    if (existing) existing.count++;
    else viewportCounts.set(key, { width: r.viewportWidth, height: r.viewportHeight, count: 1 });
  }
  const topUrls = [...urlCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([url, count]) => ({ url, count }));
  const sampleViewports = [...viewportCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const sampleUserAgents = [...new Set(rows.map((r) => r.userAgent))].slice(0, 3);

  return {
    contractName,
    componentName,
    errorMessage,
    occurrences: rows.length,
    uniqueSessions: sessions.size,
    uniqueUrls: urlCounts.size,
    topUrls,
    firstSeen: rows[rows.length - 1].timestamp,
    lastSeen:  rows[0].timestamp,
    sampleViewports,
    sampleUserAgents,
  };
}
