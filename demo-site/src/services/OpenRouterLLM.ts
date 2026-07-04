import type { LLMService, LLMGenerateTextOptions, LLMGenerateTextResponse } from '@orkg/scidquest';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterLLM implements LLMService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'openai/gpt-4o-mini') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(
    prompt: string,
    options?: LLMGenerateTextOptions
  ): Promise<LLMGenerateTextResponse> {
    const messages: Array<{ role: string; content: string }> = [];

    if (options?.systemContext) {
      messages.push({ role: 'system', content: options.systemContext });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SciD-QuESt Demo',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenRouter API error (${response.status}): ${errorData?.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    const promptTokens = data.usage?.prompt_tokens ?? 0;
    const completionTokens = data.usage?.completion_tokens ?? 0;

    return {
      text: choice?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          }
        : undefined,
    };
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 8;
  }

  getModel(): string {
    return this.model;
  }

  setModel(model: string) {
    this.model = model;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
}

/** Available OpenRouter models for the demo */
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Recommended)' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
  { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B' },
];
