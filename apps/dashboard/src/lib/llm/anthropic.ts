import { LlmRequestError, type GenerateOptions } from './index';

/**
 * Anthropic Messages API adapter.
 * Docs: https://docs.anthropic.com/en/api/messages
 */
export async function generateAnthropic(
  opts: GenerateOptions,
  model: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      system: opts.systemPrompt,
      messages: [{ role: 'user', content: opts.userPrompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LlmRequestError(
      `Anthropic HTTP ${res.status}${body ? `: ${body.slice(0, 240)}` : ''}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  // The Messages API returns an array of content blocks; concatenate the
  // text-typed ones.
  const text = (json.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!)
    .join('\n')
    .trim();
  if (!text) throw new LlmRequestError('Anthropic returned no text');
  return text;
}
