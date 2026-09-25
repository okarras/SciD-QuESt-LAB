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

const DEFAULT_BATCH_SYSTEM_PROMPT = `You are a research data extractor. Read the paper and answer each question based on its content.

For each question, give 3 ranked suggestions (most to least likely). Always commit to a best answer — infer from the paper when it is not stated explicitly; do not refuse or say the information is missing.

Answer rules:
- If options are listed, the answer MUST be exactly one of them (match an option, do not use the paper's raw wording). For multi_select, give a comma-separated subset of the options that apply.
- boolean → "yes" or "no".
- text → a short answer that matches how the field is normally expressed (singular noun form, no trailing punctuation).

Evidence: { pageNumber, excerpt } where excerpt is a 10-50 word quote copied exactly from the paper (use the [PAGE N] markers). EVERY suggestion — including ranks 2 and 3 — must include at least one evidence item that supports that specific answer. The answer itself follows the rules above.

confidence: 0.9 explicitly stated, 0.5 inferred, 0.2 weak guess.

Return ONLY JSON (no markdown, no extra text):
{"answers":{"<question_id>":{"suggestions":[{"rank":1,"text":"","confidence":0.9,"evidence":[{"pageNumber":1,"excerpt":""}]},{"rank":2,"text":"","confidence":0.5,"evidence":[{"pageNumber":1,"excerpt":""}]},{"rank":3,"text":"","confidence":0.2,"evidence":[{"pageNumber":1,"excerpt":""}]}]}}}`;

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
    // 0 or undefined means no limit — let the model use its full completion budget
    this.maxTokens = evalConfig?.evaluation?.batch_max_tokens ?? 0;
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

    // Long document first (best practice for long-context models)
    prompt += `<paper`;
    if (paperTitle) {
      prompt += ` title="${paperTitle.replace(/"/g, "'")}"`;
    }
    prompt += `>\n${pdfContent}\n</paper>\n\n`;

    // Questions block
    prompt += `<questions count="${questions.length}">\n`;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let line = `${i + 1}. id="${q.id}" type="${q.type}" — ${q.text}`;
      if (q.options && q.options.length > 0) {
        line += `\n   options: ${q.options.join(', ')}`;
      }
      prompt += line + '\n';
    }
    prompt += `</questions>\n\n`;

    // Task instruction re-anchored at the very bottom (freshest in attention)
    prompt += `Answer all ${questions.length} questions above using only the content in <paper>. `;
    prompt += `Return a single JSON object with an "answers" key whose keys are the exact question ids. `;
    prompt += `Follow the confidence rubric and evidence rules. Output ONLY the JSON.`;

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
