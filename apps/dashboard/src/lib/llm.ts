/**
 * BYOK LLM resolver. We support three providers via env vars; whichever
 * is set wins (watsonX takes precedence so existing IBM users don't
 * surprise-flip to OpenAI). Used by /api/llm/status to render the
 * "configured / configure me" state, and by /api/llm/generate to pick
 * the actual call target.
 */

export type LlmProvider = 'watsonx' | 'openai' | 'anthropic';

export interface LlmStatus {
  configured: boolean;
  provider: LlmProvider | null;
  model: string | null;
}

export function getLlmStatus(): LlmStatus {
  if (process.env.WATSONX_API_KEY && process.env.WATSONX_PROJECT_ID) {
    return {
      configured: true,
      provider: 'watsonx',
      model: process.env.WATSONX_MODEL ?? 'ibm/granite-3-3-8b-instruct',
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      configured: true,
      provider: 'openai',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      configured: true,
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6',
    };
  }
  return { configured: false, provider: null, model: null };
}
