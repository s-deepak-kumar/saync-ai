import { NextResponse, type NextRequest } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/connection';
import { issues } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const status = req.nextUrl.searchParams.get('status');
  const severity = req.nextUrl.searchParams.get('severity');

  const conditions = [];
  if (status === 'open' || status === 'resolved') {
    conditions.push(eq(issues.status, status));
  }
  if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
    conditions.push(eq(issues.severity, severity));
  }

  const rows = await db.query.issues.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(issues.lastSeenAt)],
  });
  return NextResponse.json(rows);
}
