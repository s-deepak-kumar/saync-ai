import { LlmRequestError, type GenerateOptions } from './index';

/**
 * OpenAI Chat Completions adapter.
 * Docs: https://platform.openai.com/docs/api-reference/chat
 */
export async function generateOpenAI(
  opts: GenerateOptions,
  model: string,
  maxTokens: number,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user',   content: opts.userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new LlmRequestError(
      `OpenAI HTTP ${res.status}${body ? `: ${body.slice(0, 240)}` : ''}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new LlmRequestError('OpenAI returned no text');
  return text.trim();
}
