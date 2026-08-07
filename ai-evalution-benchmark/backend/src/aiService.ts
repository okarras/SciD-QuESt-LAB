import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export interface AIConfig {
  openrouterApiKey: string;
  openrouterModel: string;
}

export interface GenerateTextRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemContext?: string;
}

export interface GenerateTextResponse {
  text: string;
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  private sanitizeModelName(modelName: string): string {
    return modelName.trim().replace(/^["']|["']$/g, '');
  }

  private getOpenRouterHeaders(): Record<string, string> {
    const referer = (
      process.env.OPENROUTER_HTTP_REFERER || 'https://ai-evaluation-benchmark'
    )
      .trim()
      .replace(/^["']|["']$/g, '');
    const title = (
      process.env.OPENROUTER_APP_TITLE || 'AI Evaluation Benchmark'
    ).trim();
    return {
      'HTTP-Referer': referer,
      'X-Title': title,
    };
  }

  public async generateText(
    request: GenerateTextRequest
  ): Promise<GenerateTextResponse> {
    try {
      if (!this.config.openrouterApiKey) {
        throw new Error('OpenRouter API key is not configured');
      }

      const openrouter = createOpenAI({
        apiKey: this.config.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: this.getOpenRouterHeaders(),
      });

      const modelId = this.sanitizeModelName(
        request.model || this.config.openrouterModel
      );
      const model = openrouter.languageModel(modelId);

      const generateOptions: any = {
        model,
        prompt: request.prompt,
        temperature: request.temperature ?? 0.3,
        system: request.systemContext,
      };

      if (request.maxTokens && request.maxTokens > 0) {
        generateOptions.maxOutputTokens = request.maxTokens;
      }

      const result = await generateText(generateOptions);

      if (!result) {
        throw new Error('AI service returned empty result');
      }

      // Normalize text
      let normalizedText = '';
      if (result.text) {
        normalizedText =
          typeof result.text === 'string' ? result.text : String(result.text);
      }

      // Handle reasoning (some models return reasoning separately)
      const reasoningVal = (result as any).reasoning;
      let normalizedReasoning: string | undefined = undefined;
      if (reasoningVal !== undefined && reasoningVal !== null) {
        if (Array.isArray(reasoningVal)) {
          normalizedReasoning = JSON.stringify(reasoningVal);
        } else if (typeof reasoningVal === 'string') {
          normalizedReasoning = reasoningVal;
        } else {
          normalizedReasoning = String(reasoningVal);
        }
      }

      const finalText = normalizedText.trim() || normalizedReasoning || '';

      // Normalize usage
      let usage: any = result.usage;
      if (!usage && (result as any).response) {
        usage = (result as any).response.usage;
      }

      const normalizedUsage = usage
        ? {
            promptTokens: usage.promptTokens ?? usage.inputTokens ?? 0,
            completionTokens:
              usage.completionTokens ?? usage.outputTokens ?? 0,
            totalTokens:
              usage.totalTokens ??
              (usage.promptTokens ?? usage.inputTokens ?? 0) +
                (usage.completionTokens ?? usage.outputTokens ?? 0),
          }
        : undefined;

      return {
        text: finalText,
        reasoning: normalizedReasoning,
        usage: normalizedUsage,
      };
    } catch (error) {
      console.error('Error in generateText:', {
        message: error instanceof Error ? error.message : String(error),
        model: request.model || this.config.openrouterModel,
      });

      if (error instanceof Error) throw error;
      throw new Error(`AI generation failed: ${String(error)}`);
    }
  }

  public isConfigured(): boolean {
    return this.config.openrouterApiKey.length > 0;
  }

  public getCurrentConfig() {
    return {
      provider: 'openrouter',
      model: this.config.openrouterModel,
      apiKeyConfigured: this.isConfigured(),
    };
  }
}
