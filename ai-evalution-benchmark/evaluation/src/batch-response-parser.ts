/**
 * Batch Response Parser - Parses the structured JSON response from batch mode
 * into per-question suggestions that feed into the existing metrics calculator.
 */

import type { Suggestion } from './simple-metrics-calculator';

export interface ParsedBatchAnswer {
  questionId: string;
  suggestions: Suggestion[];
  parseSuccess: boolean;
  error?: string;
}

export interface BatchParseResult {
  answers: ParsedBatchAnswer[];
  rawResponse: string;
  parseSuccess: boolean;
  totalParsed: number;
  totalFailed: number;
  error?: string;
}

export class BatchResponseParser {
  /**
   * Parse the raw LLM response into per-question suggestions.
   * Handles various response formats and edge cases.
   */
  parseBatchResponse(
    rawResponse: string,
    expectedQuestionIds: string[]
  ): BatchParseResult {
    const result: BatchParseResult = {
      answers: [],
      rawResponse,
      parseSuccess: false,
      totalParsed: 0,
      totalFailed: 0,
    };

    if (!rawResponse || !rawResponse.trim()) {
      result.error = 'Empty response from LLM';
      result.answers = expectedQuestionIds.map((id) => ({
        questionId: id,
        suggestions: [],
        parseSuccess: false,
        error: 'Empty response',
      }));
      result.totalFailed = expectedQuestionIds.length;
      return result;
    }

    try {
      // Clean JSON from markdown code blocks
      let cleanedText = rawResponse.trim();
      cleanedText = cleanedText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Remove control characters
      cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      const parsed = JSON.parse(cleanedText);

      // Expect { "answers": { "question_id": { "suggestions": [...] } } }
      const answersObj = parsed.answers || parsed;

      if (typeof answersObj !== 'object') {
        throw new Error('Response is not an object');
      }

      for (const questionId of expectedQuestionIds) {
        const answer = answersObj[questionId];

        if (!answer) {
          result.answers.push({
            questionId,
            suggestions: [],
            parseSuccess: false,
            error: `No answer found for question "${questionId}"`,
          });
          result.totalFailed++;
          continue;
        }

        try {
          const suggestions = this.extractSuggestions(answer);
          result.answers.push({
            questionId,
            suggestions,
            parseSuccess: true,
          });
          result.totalParsed++;
        } catch (e) {
          result.answers.push({
            questionId,
            suggestions: [],
            parseSuccess: false,
            error: `Failed to parse suggestions: ${e instanceof Error ? e.message : String(e)}`,
          });
          result.totalFailed++;
        }
      }

      result.parseSuccess = result.totalParsed > 0;
    } catch (error) {
      result.error = `JSON parse failed: ${error instanceof Error ? error.message : String(error)}`;

      // Try to salvage individual answers with regex
      const salvaged = this.trySalvageResponse(rawResponse, expectedQuestionIds);
      if (salvaged.length > 0) {
        result.answers = salvaged;
        result.totalParsed = salvaged.filter((a) => a.parseSuccess).length;
        result.totalFailed = salvaged.filter((a) => !a.parseSuccess).length;
        result.parseSuccess = result.totalParsed > 0;
      } else {
        result.answers = expectedQuestionIds.map((id) => ({
          questionId: id,
          suggestions: [],
          parseSuccess: false,
          error: result.error,
        }));
        result.totalFailed = expectedQuestionIds.length;
      }
    }

    return result;
  }

  private extractSuggestions(answer: any): Suggestion[] {
    let rawSuggestions: any[];

    if (answer.suggestions && Array.isArray(answer.suggestions)) {
      rawSuggestions = answer.suggestions;
    } else if (Array.isArray(answer)) {
      rawSuggestions = answer;
    } else if (typeof answer === 'string') {
      // Simple text answer — wrap as single suggestion
      return [
        { position: 1, text: answer, confidence: 0.8, evidence: [] },
        { position: 2, text: answer, confidence: 0.5, evidence: [] },
        { position: 3, text: answer, confidence: 0.3, evidence: [] },
      ];
    } else if (answer.text) {
      // Single suggestion object
      return [
        {
          position: 1,
          text: String(answer.text),
          confidence: answer.confidence || 0.8,
          evidence: answer.evidence || [],
        },
      ];
    } else {
      throw new Error('Unrecognized answer format');
    }

    return rawSuggestions.slice(0, 3).map((s, index) => ({
      position: index + 1,
      text: typeof s === 'string' ? s : String(s.text || s.answer || ''),
      confidence: typeof s === 'object' ? (s.confidence || 0.8 - index * 0.2) : 0.8 - index * 0.2,
      evidence: typeof s === 'object' && Array.isArray(s.evidence)
        ? s.evidence.map((e: any) => ({
            pageNumber: e.pageNumber || e.page || 0,
            excerpt: e.excerpt || e.text || '',
          }))
        : [],
    }));
  }


  private trySalvageResponse(
    rawResponse: string,
    questionIds: string[]
  ): ParsedBatchAnswer[] {
    const results: ParsedBatchAnswer[] = [];

    for (const qId of questionIds) {
      const block = this.extractBalancedObject(rawResponse, qId);

      if (block) {
        try {
          const parsed = JSON.parse(`{${JSON.stringify(qId)}:${block}}`);
          const answer = parsed[qId];
          const suggestions = this.extractSuggestions(answer);
          results.push({ questionId: qId, suggestions, parseSuccess: true });
          continue;
        } catch {
          // fall through to failure
        }
      }

      results.push({
        questionId: qId,
        suggestions: [],
        parseSuccess: false,
        error: block ? 'Salvage parse failed' : 'Not found in response',
      });
    }

    return results;
  }

  private extractBalancedObject(text: string, qId: string): string | null {
    const keyPattern = new RegExp(`"${qId}"\\s*:\\s*\\{`);
    const match = text.match(keyPattern);
    if (!match || match.index === undefined) return null;

    // Index of the opening brace of the value object
    const start = match.index + match[0].length - 1;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.substring(start, i + 1);
        }
      }
    }

    return null;
  }
}
