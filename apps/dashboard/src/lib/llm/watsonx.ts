import { LlmRequestError, type GenerateOptions } from './index';

/**
 * IBM watsonx.ai text-generation adapter.
 *
 * Two-step protocol:
 *   1. Exchange the API key for an IAM bearer token (cached for ~50min).
 *      Docs: https://cloud.ibm.com/apidocs/iam-identity-token-api
 *   2. POST the prompt to ${WATSONX_URL}/ml/v1/text/generation.
 *      Docs: https://cloud.ibm.com/apidocs/watsonx-ai
 *
 * Default region: us-south. Override via WATSONX_URL if you're using
 * another region (e.g. eu-de, jp-tok).
 */

interface IamToken {
  access_token: string;
  expires_at: number; // unix ms
}

let cached: IamToken | null = null;

async function getIamToken(): Promise<string> {
  if (cached && cached.expires_at > Date.now() + 60_000) {
    return cached.access_token;
  }
  const apiKey = process.env.WATSONX_API_KEY!;

  const body = new URLSearchParams({
    grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
    apikey: apiKey,
  });

  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new LlmRequestError(
      `IBM IAM token exchange failed: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`,
      res.status,
    );
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  // expires_in is seconds; cache with a 60s safety margin
  cached = {
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in - 60) * 1000,
  };
  return cached.access_token;
}

export async function generateWatsonx(
  opts: GenerateOptions,
  model: string,
  maxTokens: number,
): Promise<string> {
  const projectId = process.env.WATSONX_PROJECT_ID!;
  const baseUrl = (process.env.WATSONX_URL ?? 'https://us-south.ml.cloud.ibm.com').replace(/\/$/, '');

  const token = await getIamToken();

  // Granite-style instruct templates use a system + user split. We
  // concatenate the two prompts with explicit role markers since the
  // text-generation endpoint takes a single `input` string.
  const input =
    `<|system|>\n${opts.systemPrompt}\n` +
    `<|user|>\n${opts.userPrompt}\n` +
    `<|assistant|>\n`;

  const res = await fetch(`${baseUrl}/ml/v1/text/generation?version=2024-05-31`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      input,
      model_id: model,
      project_id: projectId,
      parameters: {
        decoding_method: 'greedy',
        max_new_tokens: maxTokens,
        min_new_tokens: 50,
        stop_sequences: ['<|user|>', '<|system|>'],
        repetition_penalty: 1.05,
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // 401 means our cached token went stale — flush it so the next call refreshes
    if (res.status === 401) cached = null;
    throw new LlmRequestError(
      `WatsonX HTTP ${res.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    results?: { generated_text?: string }[];
  };
  const text = json.results?.[0]?.generated_text?.trim();
  if (!text) throw new LlmRequestError('WatsonX returned no text');
  return text;
}
