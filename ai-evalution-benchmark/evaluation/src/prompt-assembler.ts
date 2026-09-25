/**
 * Prompt Assembler - Assembles prompts using config from .eval.json
 *
 * System prompt, temperature, and max tokens are now read from the eval config
 * instead of being hardcoded constants.
 */

import type { ProcessedQuestionInfo } from './question-info-processor';
import type { FormattedPDFMetadata } from './pdf-metadata-formatter';
import type { EvalConfig } from './eval-config-loader';

export interface AssembledPrompt {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  metadata: {
    promptLength: number;
    systemPromptLength: number;
    userPromptLength: number;
    hasMetadata: boolean;
    hasOptions: boolean;
    questionType: string;
    assembledAt: number;
  };
}

// Default system prompt used when no eval config is provided
const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant helping researchers extract information from academic papers.
Your task is to analyze the provided PDF content and suggest answers to specific questions.

The PDF content is organized by chunks and pages (e.g., [PAGE 1], [PAGE 3], [PAGE 4]).
Use these markers to identify the exact source of your evidence.

For each suggestion:
1. Provide a clear, concise answer
2. Include supporting evidence with exact page numbers and text excerpts
3. Rank suggestions by relevance and confidence
4. If the question includes "Available Options", your suggestions MUST use ONLY those exact choices

CRITICAL INSTRUCTIONS FOR EVIDENCE EXCERPTS:
- Extract EXACT text from the PDF - copy it word-for-word as it appears
- Use the exact page numbers from the chunks headers (e.g., [PAGE 3] means content is from page 3)
- Keep excerpts between 10-50 words for best highlighting results
- If the text has references like [1] or [Smith 2020], include them as they appear
- The excerpt will be used to highlight text in the PDF, so accuracy is critical


Generate exactly 3 suggestions in the following JSON format:
{
  "suggestions": [
    {
      "rank": 1,
      "text": "suggested answer",
      "confidence": 0.95,
      "evidence": [
        {
          "pageNumber": 3,
          "excerpt": "exact text copied from page 3 without modifications"
        }
      ]
    }
  ]
}`;

export class FrontendPromptAssembler {
  private systemPrompt: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(evalConfig?: EvalConfig) {
    if (evalConfig) {
      this.systemPrompt = evalConfig.evaluation.system_prompt;
      this.defaultTemperature = evalConfig.evaluation.temperature;
      this.defaultMaxTokens = evalConfig.evaluation.max_tokens;
    } else {
      this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
      this.defaultTemperature = 0.3;
      this.defaultMaxTokens = 2000;
    }
  }

  assemblePrompt(
    questionInfo: ProcessedQuestionInfo,
    pdfMetadata: FormattedPDFMetadata,
    pdfContent: string
  ): AssembledPrompt {
    if (!questionInfo.questionText || !questionInfo.questionText.trim()) {
      throw new Error('Question text is required');
    }

    if (!pdfContent || !pdfContent.trim()) {
      throw new Error('PDF content is required');
    }

    const systemPrompt = this.systemPrompt;

    const userPrompt = this.buildUserPrompt(
      questionInfo,
      pdfMetadata,
      pdfContent
    );

    const promptLength = systemPrompt.length + userPrompt.length;

    return {
      systemPrompt,
      userPrompt,
      temperature: this.defaultTemperature,
      maxTokens: this.defaultMaxTokens,
      metadata: {
        promptLength,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        hasMetadata: pdfMetadata.metadataText.length > 0,
        hasOptions: questionInfo.hasOptions,
        questionType: questionInfo.questionType,
        assembledAt: Date.now(),
      },
    };
  }

  private buildUserPrompt(
    questionInfo: ProcessedQuestionInfo,
    pdfMetadata: FormattedPDFMetadata,
    pdfContent: string
  ): string {
    const metadataSection = pdfMetadata.metadataText;

    let questionSection = `Question: ${questionInfo.questionText}\n`;
    questionSection += `Question Type: ${questionInfo.questionType}`;

    if (questionInfo.hasOptions && questionInfo.questionOptions) {
      questionSection += `\nAvailable Options: ${questionInfo.questionOptions.join(', ')}`;
    }

    const contentSection = `PDF Content:\n${pdfContent}`;

    const instructionsSection = `Answer the QUESTION above using only the PDF Content. Provide exactly 3 ranked suggestions with supporting evidence.

REMEMBER: For evidence excerpts, copy the EXACT text from the PDF. The excerpts will be used to highlight text in the PDF viewer, so they must match exactly.`;

    // Order: metadata -> PDF content -> the QUESTION (last) -> instructions.
    const userPrompt = `${metadataSection}

${contentSection}

${questionSection}

${instructionsSection}`;

    return userPrompt;
  }

  /**
   * Assemble prompt for evaluation (with optional sibling context)
   */
  assembleEvaluationPrompt(
    questionInfo: ProcessedQuestionInfo,
    pdfMetadata: FormattedPDFMetadata,
    pdfContent: string,
    siblingContextSection?: string
  ): AssembledPrompt {
    if (siblingContextSection) {
      return this.assemblePromptWithContext(
        questionInfo,
        pdfMetadata,
        pdfContent,
        siblingContextSection
      );
    }
    return this.assemblePrompt(questionInfo, pdfMetadata, pdfContent);
  }

  /**
   * Assemble prompt with sibling context injected into user prompt
   */
  private assemblePromptWithContext(
    questionInfo: ProcessedQuestionInfo,
    pdfMetadata: FormattedPDFMetadata,
    pdfContent: string,
    siblingContextSection: string
  ): AssembledPrompt {
    const systemPrompt = this.systemPrompt;
    const metadataSection = pdfMetadata.metadataText;

    let questionSection = `Question: ${questionInfo.questionText}\n`;
    questionSection += `Question Type: ${questionInfo.questionType}`;
    if (questionInfo.hasOptions && questionInfo.questionOptions) {
      questionSection += `\nAvailable Options: ${questionInfo.questionOptions.join(', ')}`;
    }

    const contentSection = `PDF Content:\n${pdfContent}`;
    const instructionsSection = `Answer the QUESTION above using only the PDF Content. Provide exactly 3 ranked suggestions with supporting evidence.

REMEMBER: For evidence excerpts, copy the EXACT text from the PDF. The excerpts will be used to highlight text in the PDF viewer, so they must match exactly.`;

    // Order: metadata -> sibling context (background) -> PDF content -> the
    // QUESTION (last, freshest in attention) -> answer instructions.
    const userPrompt = `${metadataSection}
${siblingContextSection}
${contentSection}

${questionSection}

NOTE: This is the SPECIFIC question to answer. The sibling context above is background only — do NOT answer those sibling questions. Focus solely on the question above.

${instructionsSection}`;

    const promptLength = systemPrompt.length + userPrompt.length;

    return {
      systemPrompt,
      userPrompt,
      temperature: this.defaultTemperature,
      maxTokens: this.defaultMaxTokens,
      metadata: {
        promptLength,
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        hasMetadata: pdfMetadata.metadataText.length > 0,
        hasOptions: questionInfo.hasOptions,
        questionType: questionInfo.questionType,
        assembledAt: Date.now(),
      },
    };
  }
}
