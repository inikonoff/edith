import { GROQ_MODELS, OPENROUTER_MODELS } from './models';

export interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

export interface AiCallResult {
  content: string;
  provider: 'groq' | 'openrouter';
}

export class AiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRequestError';
  }
}

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new AiRequestError(`${response.status} ${response.statusText}${body ? `: ${body}` : ''}`);
  }
  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiRequestError('Empty response from model');
  return content;
}

export interface CallWithFallbackOptions {
  messages: ChatMessage[];
  modelSize: 'small' | 'large';
  groqKey: string | null;
  openRouterKey: string | null;
}

/**
 * Groq primary, OpenRouter fallback (both OpenAI-compatible Chat Completions
 * APIs, spec §41-48). Missing key or a failed call moves to the next
 * provider; if both are unavailable this throws rather than pretending the
 * request succeeded — matches how Git Save never claims success on failure.
 */
export async function callWithFallback(options: CallWithFallbackOptions): Promise<AiCallResult> {
  const { messages, modelSize, groqKey, openRouterKey } = options;
  const failures: string[] = [];

  if (groqKey) {
    try {
      const content = await callOpenAICompatible(GROQ_URL, groqKey, GROQ_MODELS[modelSize], messages);
      return { content, provider: 'groq' };
    } catch (error) {
      failures.push(`Groq: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    failures.push('Groq: no API key stored');
  }

  if (openRouterKey) {
    try {
      const content = await callOpenAICompatible(
        OPENROUTER_URL,
        openRouterKey,
        OPENROUTER_MODELS[modelSize],
        messages,
      );
      return { content, provider: 'openrouter' };
    } catch (error) {
      failures.push(`OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    failures.push('OpenRouter: no API key stored');
  }

  throw new AiRequestError(`AI request failed — ${failures.join('; ')}`);
}
