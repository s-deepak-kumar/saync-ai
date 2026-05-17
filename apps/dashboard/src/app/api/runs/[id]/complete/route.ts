import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { runs } from '@/lib/db/schema';
import { pubsub } from '@/lib/pubsub';

export const dynamic = 'force-dynamic';

const completeSchema = z.object({
  status: z.enum(['completed', 'failed']),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = completeSchema.parse(await req.json());
  const db = getDb();

  const updated = await db
    .update(runs)
    .set({ status: body.status, completedAt: new Date() })
    .where(eq(runs.id, params.id))
    .returning({ id: runs.id });

  if (updated.length === 0) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  }

  pubsub.publish(params.id, 'complete', { status: body.status });
  return NextResponse.json({ success: true });
}
