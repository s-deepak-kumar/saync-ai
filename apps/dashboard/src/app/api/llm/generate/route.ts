import { NextResponse, type NextRequest } from 'next/server';
import { getLlmStatus } from '@/lib/llm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/llm/generate — BYOK report generation.
 *
 * Body: { kind: 'issue' | 'run' | 'violations', payload: unknown }
 * The actual provider integrations land in Phase D's dogfood; for now
 * we return a 503 if nothing's configured and a 501 (placeholder) if it
 * is — so the UI can wire the buttons without breaking.
 */
export async function POST(_req: NextRequest) {
  const status = getLlmStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: 'No LLM provider configured.',
        hint: 'Set WATSONX_API_KEY+WATSONX_PROJECT_ID, OPENAI_API_KEY, or ANTHROPIC_API_KEY in your .env.',
      },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: 'Report generation lands in the next release.', provider: status.provider },
    { status: 501 },
  );
}
