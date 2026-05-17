import { NextResponse } from 'next/server';
import { getLlmStatus } from '@/lib/llm';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getLlmStatus());
}
