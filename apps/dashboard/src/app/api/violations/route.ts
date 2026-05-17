import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, gte, desc } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { productionViolations } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

const violationSchema = z.object({
  contractName: z.string().min(1),
  componentName: z.string().min(1),
  errorMessage: z.string().min(1),
  expectedValue: z.string().optional(),
  observedValue: z.string().optional(),
  sessionId: z.string().min(1),
  userAgent: z.string().min(1),
  viewportWidth: z.number().int().positive(),
  viewportHeight: z.number().int().positive(),
  url: z.string().url(),
  timestamp: z.string().min(1),
});

const batchSchema = z.union([
  violationSchema,
  z.array(violationSchema).max(100),
]);

export async function GET(req: NextRequest) {
  const db = getDb();
  const since = req.nextUrl.searchParams.get('since');
  const contract = req.nextUrl.searchParams.get('contract');

  const conditions = [];
  if (since) conditions.push(gte(productionViolations.timestamp, since));
  if (contract) conditions.push(eq(productionViolations.contractName, contract));

  const rows = await db.query.productionViolations.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(productionViolations.timestamp)],
    limit: 100,
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const parsed = batchSchema.parse(await req.json());
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length === 0) return NextResponse.json({ inserted: 0 }, { status: 201 });

  const db = getDb();
  const now = new Date();
  await db.insert(productionViolations).values(
    list.map((v) => ({
      id: crypto.randomUUID(),
      contractName: v.contractName,
      componentName: v.componentName,
      errorMessage: v.errorMessage,
      expectedValue: v.expectedValue ?? null,
      observedValue: v.observedValue ?? null,
      sessionId: v.sessionId,
      userAgent: v.userAgent,
      viewportWidth: v.viewportWidth,
      viewportHeight: v.viewportHeight,
      url: v.url,
      timestamp: v.timestamp,
      createdAt: now,
    })),
  );
  return NextResponse.json({ inserted: list.length }, { status: 201 });
}
