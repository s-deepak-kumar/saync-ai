import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const createRunSchema = z.object({
  environment: z.enum(['local', 'dev', 'prod', 'ci']),
  viewport: z.string().optional(),
  gitBranch: z.string().optional(),
  gitCommit: z.string().optional(),
  totalContracts: z.number().int().positive(),
});

/**
 * GET /api/runs — recent runs, newest first.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10), 200);
  const rows = await db.query.runs.findMany({
    orderBy: [desc(runs.startedAt)],
    limit,
  });
  return NextResponse.json(rows);
}

/**
 * POST /api/runs — start a new run. Agent-facing.
 */
export async function POST(req: NextRequest) {
  const body = createRunSchema.parse(await req.json());
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(runs).values({
    id,
    status: 'running',
    startedAt: now,
    totalContracts: body.totalContracts,
    passedContracts: 0,
    failedContracts: 0,
    environment: body.environment,
    viewport: body.viewport ?? null,
    gitBranch: body.gitBranch ?? null,
    gitCommit: body.gitCommit ?? null,
    createdAt: now,
  });

  return NextResponse.json({ runId: id }, { status: 201 });
}
