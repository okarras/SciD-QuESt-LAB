/**
 * Ground Truth Mapper - Generic engine that reads mappings from .eval.json
 *
 * Instead of hardcoding question ID → metadata path mappings,
 * this module reads them from the eval config and applies named transforms.
 */

import type { EvalConfig, GroundTruthMappingEntry } from './eval-config-loader';
import type { EvaluationQuestion } from './evaluation-runner';

const SENTINEL_VALUES = new Set([
  'no question',
  'no questions',
  'no type',
  'no types',
  'no method',
  'no methods',
  'no collection',
  'no analysis',
]);

function isSentinelValue(value: any): boolean {
  if (typeof value !== 'string') return false;
  return SENTINEL_VALUES.has(value.toLowerCase().trim());
}

type TransformFn = (value: any, config?: Record<string, any>) => any;

const TRANSFORM_REGISTRY: Record<string, TransformFn> = {
  direct: (value: any) => value,
  ensure_array: (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return [];
  },

  filter_array: (value: any) => {
    if (!Array.isArray(value)) return [];
    return value.filter((item: any) => Boolean(item) && !isSentinelValue(String(item)));
  },

  array_field: (value: any, config?: Record<string, any>) => {
    if (!Array.isArray(value)) return [];
    const field = config?.field || 'name';
    return value
      .map((item: any) => item?.[field])
      .filter((v: any) => Boolean(v) && !isSentinelValue(String(v)));
  },

  array_non_empty_boolean: (value: any) => {
    if (Array.isArray(value) && value.length > 0) {
      return 'yes';
    }
    return 'no';
  },

  flags_to_list: (value: any, config?: Record<string, any>) => {
    if (!value || typeof value !== 'object' || !config) return [];
    const results: string[] = [];
    for (const [key, displayName] of Object.entries(config)) {
      if (value[key] === '1' || value[key] === true) {
        results.push(displayName as string);
      }
    }
    return results;
  },

  truthy_to_yes_no: (value: any) => {
    if (value === true || value === 'true' || value === '1') return 'yes';
    if (value === false || value === 'false' || value === '0') return 'no';
    return undefined;
  },


  first_item_field: (value: any, config?: Record<string, any>) => {
    if (!Array.isArray(value) || value.length === 0) return '';
    const field = config?.field || 'text';
    const result = value[0]?.[field] || '';
    if (isSentinelValue(result)) return '';
    return result;
  },


  first_item_boolean_field: (value: any, config?: Record<string, any>) => {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    const firstItem = value[0];
    if (!firstItem) return undefined;
    // Check if the parent item is sentinel
    if (firstItem.question && isSentinelValue(firstItem.question)) return undefined;
    const field = config?.field || 'highlighted';
    const fieldValue = firstItem[field];
    if (fieldValue === '1' || fieldValue === true) return 'yes';
    if (fieldValue === '0' || fieldValue === false) return 'no';
    return undefined;
  },

  nested_first_item_field: (value: any, config?: Record<string, any>) => {
    if (!Array.isArray(value) || value.length === 0) return '';
    const firstItem = value[0];
    if (!firstItem || isSentinelValue(firstItem?.question)) return '';
    const nestedField = config?.nested_field || 'subquestions';
    const field = config?.field || 'text';
    const nested = firstItem[nestedField];
    if (!Array.isArray(nested) || nested.length === 0) return '';
    const result = nested[0]?.[field] || '';
    if (isSentinelValue(result)) return '';
    return result;
  },


  join_array_field: (value: any, config?: Record<string, any>) => {
    if (!Array.isArray(value) || value.length === 0) return '';
    const field = config?.field || 'text';
    const separator = config?.separator || ' | ';
    const items = value
      .map((item: any) => item?.[field] || '')
      .filter((v: string) => v && !isSentinelValue(v));
    return items.length > 0 ? items.join(separator) : '';
  },

  analysis_methods_aggregate: (value: any) => {
    const methods: string[] = [];
    if (value?.descriptive?.length > 0) {
      methods.push('descriptive statistics');
    }
    if (value?.inferential?.length > 0) {
      methods.push('inferential statistics');
    }
    if (value?.machine_learning?.length > 0) {
      methods.push('machine learning');
    }
    return methods;
  },


  custom: (value: any, config?: Record<string, any>) => {
    const customId = config?.custom_id;

    switch (customId) {
      case 'research_questions_list': {
        if (!Array.isArray(value) || value.length === 0) return [];
        const firstQuestion = value[0];
        if (isSentinelValue(firstQuestion?.question)) return [];
        return [
          {
            text: firstQuestion.question || '',
            highlighted:
              firstQuestion.highlighted_question === '1' ||
              firstQuestion.highlighted_question === true,
            answer_highlighted:
              firstQuestion.highlighted_answer === '1' ||
              firstQuestion.highlighted_answer === true,
          },
        ].filter((q) => q.text.length > 0);
      }
      default:
        return value;
    }
  },
};

export class GroundTruthMapper {
  private evalConfig: EvalConfig;

  constructor(evalConfig: EvalConfig) {
    this.evalConfig = evalConfig;
  }

  /**
   * Map questions to their ground truth values from metadata
   */
  mapQuestionsToGroundTruth(
    questions: EvaluationQuestion[],
    metadata: any
  ): EvaluationQuestion[] {
    const mappings = this.evalConfig.ground_truth_mappings;
    const mappedQuestions: EvaluationQuestion[] = [];

    for (const question of questions) {
      const mapping = mappings[question.id];

      if (!mapping) {
        console.log(
          `No ground truth mapping found for question: ${question.id}`
        );
        continue;
      }

      const groundTruth = this.extractAndTransform(metadata, mapping);

      if (this.hasValidGroundTruth(groundTruth)) {
        mappedQuestions.push({
          ...question,
          groundTruth,
        });
      } else {
        console.log(`No valid ground truth for question: ${question.id}`);
      }
    }

    console.log(
      `Mapped ${mappedQuestions.length}/${questions.length} questions to ground truth`
    );
    return mappedQuestions;
  }

  private extractAndTransform(
    metadata: any,
    mapping: GroundTruthMappingEntry
  ): any {
    // Navigate the metadata path
    let value = metadata;
    for (const key of mapping.path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (value === undefined) {
      return undefined;
    }

    // Apply the named transform
    const transformFn = TRANSFORM_REGISTRY[mapping.transform];
    if (!transformFn) {
      console.warn(
        `Unknown transform "${mapping.transform}" — returning raw value`
      );
      return value;
    }

    try {
      return transformFn(value, mapping.config);
    } catch (error) {
      console.warn(
        `Transform "${mapping.transform}" failed:`,
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  private hasValidGroundTruth(groundTruth: any): boolean {
    if (groundTruth === null || groundTruth === undefined) {
      return false;
    }

    if (typeof groundTruth === 'string') {
      const trimmed = groundTruth.trim();
      if (trimmed.length === 0) return false;
      if (isSentinelValue(trimmed)) return false;
      return true;
    }

    if (Array.isArray(groundTruth)) {
      const valid = groundTruth.filter(
        (item) =>
          item !== null &&
          item !== undefined &&
          String(item).trim().length > 0 &&
          !isSentinelValue(String(item))
      );
      return valid.length > 0;
    }

    return true;
  }
}

export { TRANSFORM_REGISTRY };
export type { TransformFn };
