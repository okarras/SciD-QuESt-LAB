/**
 * Sibling Context Provider
 * Enabled via --with-context CLI flag.
 *
 * Reads sibling dependencies from the .eval.json config
 * and question labels from the template itself — no hardcoded maps.
 */

import type { EvalConfig } from './eval-config-loader';
import type { EvaluationQuestion } from './evaluation-runner';
import type { TemplateQuestion } from './template-loader';

export interface SiblingEntry {
  questionId: string;
  questionText: string;
  answer: string;
}

export class SiblingContextProvider {
  private siblingDependencies: Record<string, string[]>;
  private questionLabels: Map<string, string>;

  constructor(evalConfig: EvalConfig, templateQuestions?: TemplateQuestion[]) {
    this.siblingDependencies = evalConfig.sibling_dependencies || {};

    this.questionLabels = new Map();
    if (templateQuestions) {
      for (const q of templateQuestions) {
        this.questionLabels.set(q.id, q.label);
      }
    }
  }

  buildSiblingContextSection(
    questionId: string,
    allQuestions: EvaluationQuestion[]
  ): string {
    const siblingIds = this.siblingDependencies[questionId];
    if (!siblingIds || siblingIds.length === 0) {
      return '';
    }

    const gtLookup = new Map<string, any>();
    for (const q of allQuestions) {
      if (
        q.groundTruth !== null &&
        q.groundTruth !== undefined &&
        q.groundTruth !== ''
      ) {
        gtLookup.set(q.id, q.groundTruth);
      }
    }

    const siblings: SiblingEntry[] = [];
    for (const sibId of siblingIds) {
      const gt = gtLookup.get(sibId);
      if (gt === null || gt === undefined || gt === '') continue;

      const label = this.questionLabels.get(sibId) || sibId;
      const answerStr = Array.isArray(gt) ? gt.join(', ') : String(gt);

      siblings.push({
        questionId: sibId,
        questionText: label,
        answer: answerStr,
      });
    }

    if (siblings.length === 0) {
      return '';
    }

    const siblingLines = siblings
      .map(
        (s, idx) => `\n${idx + 1}. ${s.questionText}\n   Answer: "${s.answer}"`
      )
      .join('\n');

    return `
SIBLING QUESTIONS (Already Answered):
${siblingLines}

IMPORTANT: Generate suggestions that:
- Are CONSISTENT and ALIGNED with sibling answers
- Complement and build upon the information in sibling answers
- Maintain the same level of detail and perspective as siblings
- Ensure coherence across all questions at this level
- Avoid contradicting information provided in sibling answers
`;
  }
}
