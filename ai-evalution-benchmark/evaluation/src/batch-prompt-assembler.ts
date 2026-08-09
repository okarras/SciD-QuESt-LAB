/**
 * Batch Prompt Assembler - Builds a single prompt with ALL questions for a paper
 *
 * Instead of one LLM call per question, this assembles one prompt that asks
 * the model to answer all questions at once given the full PDF content.
 */

import type { EvalConfig } from './eval-config-loader';
import type { EvaluationQuestion } from './evaluation-runner';

export interface BatchPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  metadata: {
    promptLength: number;
    questionCount: number;
    pdfContentLength: number;
    estimatedTokens: number;
    assembledAt: number;
  };
}

const DEFAULT_BATCH_SYSTEM_PROMPT = `You are an AI assistant analyzing an academic paper. You will be given the full text of a paper and a list of questions to answer.

For EACH question, provide exactly 3 ranked suggestions. Each suggestion must include:
- The answer text
- A confidence score (0.0 to 1.0)
- Supporting evidence with page numbers and exact text excerpts from the paper

CRITICAL RULES:
- Answer ALL questions in a single JSON response
- For questions with "Options:", your answer MUST be one of the listed options exactly
- For boolean questions (yes/no), answer with "yes" or "no"
- For text questions, provide a concise factual answer based on the paper
- For multi-select questions, provide comma-separated values from the options
- Extract EXACT text from the PDF for evidence excerpts
- If the paper does not contain information for a question, still provide your best inference

Respond with ONLY valid JSON in this exact format:
{
  "answers": {
    "<question_id>": {
      "suggestions": [
        {
          "rank": 1,
          "text": "your answer",
          "confidence": 0.95,
          "evidence": [{ "pageNumber": 3, "excerpt": "exact text from paper" }]
        },
        {
          "rank": 2,
          "text": "alternative answer",
          "confidence": 0.7,
          "evidence": [{ "pageNumber": 5, "excerpt": "supporting text" }]
        },
        {
          "rank": 3,
          "text": "another possibility",
          "confidence": 0.4,
          "evidence": []
        }
      ]
    }
  }
}`;

export class BatchPromptAssembler {
  private systemPrompt: string;
  private temperature: number;
  private maxTokens: number;

  constructor(evalConfig?: EvalConfig) {
    if (evalConfig?.evaluation?.batch_system_prompt) {
      this.systemPrompt = evalConfig.evaluation.batch_system_prompt;
    } else {
      this.systemPrompt = DEFAULT_BATCH_SYSTEM_PROMPT;
    }
    this.temperature = evalConfig?.evaluation?.temperature ?? 0.3;
    this.maxTokens = evalConfig?.evaluation?.batch_max_tokens ?? 8000;
  }

  assembleBatchPrompt(
    questions: EvaluationQuestion[],
    pdfContent: string,
    paperTitle?: string
  ): BatchPrompt {
    if (!pdfContent || !pdfContent.trim()) {
      throw new Error('PDF content is required');
    }

    if (questions.length === 0) {
      throw new Error('At least one question is required');
    }

    const userPrompt = this.buildUserPrompt(questions, pdfContent, paperTitle);
    const promptLength = this.systemPrompt.length + userPrompt.length;
    const estimatedTokens = Math.ceil(promptLength / 4);

    return {
      systemPrompt: this.systemPrompt,
      userPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      metadata: {
        promptLength,
        questionCount: questions.length,
        pdfContentLength: pdfContent.length,
        estimatedTokens,
        assembledAt: Date.now(),
      },
    };
  }

  private buildUserPrompt(
    questions: EvaluationQuestion[],
    pdfContent: string,
    paperTitle?: string
  ): string {
    let prompt = '';

    if (paperTitle) {
      prompt += `Paper Title: ${paperTitle}\n\n`;
    }

    prompt += `--- PAPER CONTENT ---\n${pdfContent}\n--- END OF PAPER ---\n\n`;

    prompt += `--- QUESTIONS (${questions.length} total) ---\n\n`;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      prompt += `${i + 1}. [id: ${q.id}] ${q.text}\n`;
      prompt += `   Type: ${q.type}\n`;

      if (q.options && q.options.length > 0) {
        prompt += `   Options: ${q.options.join(', ')}\n`;
      }

      prompt += '\n';
    }

    prompt += `--- END OF QUESTIONS ---\n\n`;
    prompt += `Answer ALL ${questions.length} questions above. Return a single JSON object with an "answers" key containing all question IDs as keys.`;

    return prompt;
  }


  estimateTokenUsage(
    questions: EvaluationQuestion[],
    pdfContent: string
  ): { inputTokens: number; outputTokens: number; total: number } {
    const inputEstimate = Math.ceil(
      (this.systemPrompt.length + pdfContent.length + questions.length * 100) / 4
    );
    const outputEstimate = questions.length * 200;

    return {
      inputTokens: inputEstimate,
      outputTokens: outputEstimate,
      total: inputEstimate + outputEstimate,
    };
  }
}
