/**
 * Eval Config Loader - Loads the companion .eval.json for a given template
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MetricConfig {
  metric: string;
  threshold: number;
}

export interface GroundTruthMappingEntry {
  path: string[];
  transform: string;
  config?: Record<string, any>;
}

export interface EvalConfig {
  template_id: string;
  version: string;
  evaluation: {
    system_prompt: string;
    suggestions_count: number;
    temperature: number;
    max_tokens: number;
    batch_system_prompt?: string;
    batch_max_tokens?: number;
  };
  metrics: Record<string, MetricConfig>;
  skip_questions: string[];
  skip_types: string[];
  ground_truth_mappings: Record<string, GroundTruthMappingEntry>;
  sibling_dependencies: Record<string, string[]>;
}

export class EvalConfigLoader {
  private config: EvalConfig | null = null;
  private configPath: string;

  constructor(templatePath: string) {
    // Derive .eval.json path from template path
    // e.g., templates/foo.json → templates/foo.eval.json
    const dir = path.dirname(templatePath);
    const basename = path.basename(templatePath, '.json');
    this.configPath = path.join(dir, `${basename}.eval.json`);
  }

  load(): EvalConfig {
    if (this.config) {
      return this.config;
    }

    if (!fs.existsSync(this.configPath)) {
      throw new Error(
        `Eval config not found: ${this.configPath}\n` +
          `Each template requires a companion .eval.json file.\n` +
          `Expected: <template_name>.eval.json alongside the template.`
      );
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(content) as EvalConfig;

      console.log(
        `Loaded eval config: ${this.config.template_id} v${this.config.version}`
      );
      console.log(
        `  Ground truth mappings: ${Object.keys(this.config.ground_truth_mappings).length}`
      );
      console.log(
        `  Sibling dependencies: ${Object.keys(this.config.sibling_dependencies).length}`
      );
      console.log(
        `  Metric types: ${Object.keys(this.config.metrics).length}`
      );

      return this.config;
    } catch (error) {
      throw new Error(
        `Failed to load eval config: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  getEvaluation() {
    return this.load().evaluation;
  }

  getMetrics() {
    return this.load().metrics;
  }

  getSkipQuestions() {
    return this.load().skip_questions;
  }

  getSkipTypes() {
    return this.load().skip_types;
  }

  getGroundTruthMappings() {
    return this.load().ground_truth_mappings;
  }

  getSiblingDependencies() {
    return this.load().sibling_dependencies;
  }

  getMetricForType(questionType: string): MetricConfig {
    const metrics = this.getMetrics();
    const normalized = questionType.toLowerCase();

    if (metrics[normalized]) {
      return metrics[normalized];
    }

    // Fallback defaults
    return { metric: 'bertscore', threshold: 0.7 };
  }
}
