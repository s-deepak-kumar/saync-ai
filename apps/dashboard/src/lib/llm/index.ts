/**
 * BYOK LLM resolver. Three providers — WatsonX, OpenAI, Anthropic —
 * read from the user's `.env`. WatsonX wins ties (Saync is targeted at
 * the IBM Bob hackathon; existing IBM users should not surprise-flip).
 *
 * The generate() function dispatches to the configured provider and
 * returns plain markdown. Callers are responsible for surfacing
 * errors to the user.
 */

import { generateOpenAI }    from './openai';
import { generateAnthropic } from './anthropic';
import { generateWatsonx }   from './watsonx';

export type LlmProvider = 'watsonx' | 'openai' | 'anthropic';

export interface LlmStatus {
  configured: boolean;
  provider: LlmProvider | null;
  model: string | null;
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  /** Soft cap; providers may go slightly over. Default 800. */
  maxTokens?: number;
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

export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigError';
  }
}

export class LlmRequestError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'LlmRequestError';
  }
}

export async function generate(opts: GenerateOptions): Promise<{
  markdown: string;
  provider: LlmProvider;
  model: string;
}> {
  const status = getLlmStatus();
  if (!status.configured || !status.provider || !status.model) {
    throw new LlmConfigError(
      'No LLM provider configured. Set WATSONX_API_KEY+WATSONX_PROJECT_ID, OPENAI_API_KEY, or ANTHROPIC_API_KEY in your .env and restart `saync start`.',
    );
  }

  const max = opts.maxTokens ?? 800;
  let markdown: string;
  try {
    switch (status.provider) {
      case 'openai':
        markdown = await generateOpenAI(opts, status.model, max);
        break;
      case 'anthropic':
        markdown = await generateAnthropic(opts, status.model, max);
        break;
      case 'watsonx':
        markdown = await generateWatsonx(opts, status.model, max);
        break;
    }
  } catch (err) {
    if (err instanceof LlmRequestError) throw err;
    if (err instanceof Error) throw new LlmRequestError(err.message);
    throw new LlmRequestError('Unknown LLM error');
  }

  return { markdown, provider: status.provider, model: status.model };
}
