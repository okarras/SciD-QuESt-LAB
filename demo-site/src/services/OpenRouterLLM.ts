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

/** Mock LLM that returns sample suggestions matching the Student's t-test template */
export class MockLLM implements LLMService {
  async generateText(
    prompt: string,
    _options?: LLMGenerateTextOptions
  ): Promise<LLMGenerateTextResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const promptLower = prompt.toLowerCase();

    // Verification Mocking
    if (promptLower.includes('verify') || promptLower.includes('verification') || promptLower.includes('reviewer')) {
      let status: 'verified' | 'needs_improvement' = 'verified';
      let feedback = 'The answer is fully supported by the paper.';
      let score = 95;

      if (promptLower.includes('invalid') || promptLower.includes('error') || promptLower.includes('incorrect')) {
        status = 'needs_improvement';
        feedback = 'The answer mentions elements not found in the paper context. Please review the inputs.';
        score = 40;
      }

      return {
        text: JSON.stringify({
          qualityScore: score,
          status,
          feedback,
          suggestions: [
            'Align the inputs with standard statistical terms described in Section 3.'
          ],
          evidence: [
            { pageNumber: 1, excerpt: 'Our framework consists of three main components...', supportsAnswer: true }
          ]
        }),
        usage: {
          promptTokens: 150,
          completionTokens: 90,
          totalTokens: 240
        }
      };
    }

    // Input suggestions mock
    if (promptLower.includes('input')) {
      return {
        text: JSON.stringify({
          suggestions: [
            {
              rank: 1,
              text: 'Dataset of 15,000 annotated scientific papers spanning NLP and computer vision',
              confidence: 0.94,
              evidence: [
                { pageNumber: 1, excerpt: 'We fine-tune a DeBERTa-v3-large model on a curated dataset of 15,000 annotated scientific papers...' }
              ]
            },
            {
              rank: 2,
              text: 'DeBERTa-v3-large model inputs and model parameters',
              confidence: 0.82,
              evidence: [
                { pageNumber: 1, excerpt: 'We fine-tune a DeBERTa-v3-large model...' }
              ]
            },
            {
              rank: 3,
              text: 'Scientific document corpus containing tables, figures, and equations',
              confidence: 0.71,
              evidence: [
                { pageNumber: 1, excerpt: 'a PDF parser that handles complex layouts including tables, figures, and equations' }
              ]
            }
          ]
        }),
        usage: {
          promptTokens: 300,
          completionTokens: 180,
          totalTokens: 480
        }
      };
    }

    // Output suggestions mock
    if (promptLower.includes('output')) {
      return {
        text: JSON.stringify({
          suggestions: [
            {
              rank: 1,
              text: 'State-of-the-art F1 score of 72.3% for NER and 48.7% for RE on SciERC benchmark',
              confidence: 0.96,
              evidence: [
                { pageNumber: 1, excerpt: 'SciERC: F1 = 72.3% (NER), 48.7% (RE) — improving over prior work by +3.2% and +5.1%' }
              ]
            },
            {
              rank: 2,
              text: 'F1 score of 68.9% for NER and 41.2% for RE on SciREX benchmark',
              confidence: 0.88,
              evidence: [
                { pageNumber: 1, excerpt: 'SciREX: F1 = 68.9% (NER), 41.2% (RE) — new state of the art' }
              ]
            },
            {
              rank: 3,
              text: 'F1 score of 75.1% for NER and 52.4% for RE on SciKG-Bench dataset',
              confidence: 0.79,
              evidence: [
                { pageNumber: 1, excerpt: 'SciKG-Bench: F1 = 75.1% (NER), 52.4% (RE)' }
              ]
            }
          ]
        }),
        usage: {
          promptTokens: 300,
          completionTokens: 180,
          totalTokens: 480
        }
      };
    }

    // Default Fallback
    return {
      text: JSON.stringify({
        suggestions: [
          {
            rank: 1,
            text: 'Novel transformer-based framework for automated knowledge extraction',
            confidence: 0.90,
            evidence: [
              { pageNumber: 1, excerpt: 'This paper presents a novel transformer-based framework...' }
            ]
          }
        ]
      }),
      usage: {
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300
      }
    };
  }

  isConfigured(): boolean {
    return true;
  }
}

/** Available OpenRouter models for the demo */
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Recommended)' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'mistralai/mistral-7b-instruct', name: 'Mistral 7B' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
];
