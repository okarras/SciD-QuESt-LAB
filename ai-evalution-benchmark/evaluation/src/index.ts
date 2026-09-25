#!/usr/bin/env node

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { FrontendExactEvaluationRunner } from './evaluation-runner';
import { BatchEvaluationRunner } from './batch-evaluation-runner';

interface CLIOptions {
  dataset: string;
  output: string;
  template?: string;
  mode?: 'per-question' | 'batch';
  limit?: number;
  offset?: number;
  backend?: string;
  model?: string;
  modelTag?: string;
  withContext?: boolean;
  fullContent?: boolean;
  skipExisting?: boolean;
  onlyQuestions?: string[];
  test?: boolean;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    dataset: process.env.DEFAULT_DATASET_PATH || '../dataset',
    output: process.env.DEFAULT_OUTPUT_FILE || 'frontend-exact-results.json',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dataset':
        options.dataset = args[++i];
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--template':
        options.template = args[++i];
        break;
      case '--mode':
        options.mode = args[++i] as 'per-question' | 'batch';
        break;
      case '--limit':
        options.limit = parseInt(args[++i]);
        break;
      case '--offset':
        options.offset = parseInt(args[++i]);
        break;
      case '--backend':
        options.backend = args[++i];
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--model-tag':
        options.modelTag = args[++i];
        break;
      case '--with-context':
        options.withContext = true;
        break;
      case '--full-content':
        options.fullContent = true;
        break;
      case '--skip-existing':
        options.skipExisting = true;
        break;
      case '--only-questions':
        options.onlyQuestions = args[++i].split(',').map((s) => s.trim());
        break;
      case '--test':
        options.test = true;
        break;
      case '--help':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Frontend-Exact Evaluation Runner

Usage: node dist/index.js [options]

Options:
  --dataset <path>      Path to dataset directory (default: ../dataset)
  --output <path>       Output file path (default: auto-generated with model tag)
  --template <path>     Path to questionnaire template JSON file
                        (default: templates/empirical_research_questionaire.json)
                        A companion .eval.json file must exist alongside the template.
  --mode <mode>         Evaluation mode: "per-question" (default) or "batch"
                        per-question: one LLM call per question (uses semantic chunking)
                        batch: one LLM call per paper with all questions at once
  --limit <number>      Limit number of papers to evaluate
  --offset <number>     Skip first N papers (for slab-based evaluation)
  --model <name>        Override AI model (e.g., gpt-4o-mini, gpt-3.5-turbo)
  --model-tag <tag>     Tag for output file naming and result tracking
  --with-context        Include sibling ground truth as context (simulates real app)
  --backend <url>       Backend service URL (default: http://localhost:5001)
  --skip-existing       Skip questions already evaluated in existing output file
  --only-questions <ids> Comma-separated list of question IDs to evaluate
  --test                Test backend connectivity only
  --help                Show this help message

Template System:
  Each template requires a companion evaluation config file:
    templates/my_template.json       ← questionnaire structure
    templates/my_template.eval.json  ← evaluation config (metrics, mappings, etc.)

  The eval config defines:
    - Ground truth mappings (how to extract answers from dataset metadata)
    - Metric thresholds (what counts as "correct" per question type)
    - Sibling dependencies (context injection between questions)
    - System prompt and AI parameters
    - Question skip lists

Examples:
  # Test backend connectivity
  node dist/index.js --test

  # Evaluate with default template
  node dist/index.js --limit 75 --model gpt-4o-mini --model-tag gpt4omini

  # Evaluate with a custom template
  node dist/index.js --template ./templates/my_custom_template.json --limit 10

  # Next slab (papers 75-150)
  node dist/index.js --offset 75 --limit 75 --model gpt-3.5-turbo --model-tag gpt35

Requirements:
  - Backend service running (default: http://localhost:5001)
  - Dataset with PDF files and metadata
  - Node.js 18+ (for built-in fetch support)
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    if (options.model) {
      // All models go through OpenRouter using vendor/model format
      process.env.AI_PROVIDER = 'openrouter';
      process.env.OPENROUTER_MODEL = options.model;
    }

    if (!process.argv.includes('--output')) {
      const tag = options.modelTag || options.model || 'default';
      const offsetStr = options.offset ? `${options.offset}` : '0';
      const limitStr = options.limit ? `${options.limit}` : 'all';
      options.output = `results-${tag}-${offsetStr}-${limitStr}.json`;
    }

    const useBERTScore = process.env.USE_BERTSCORE === 'true';

    // Resolve template path
    let templatePath: string | undefined;
    if (options.template) {
      templatePath = path.resolve(options.template);
    }

    const runner = new FrontendExactEvaluationRunner(options.backend, {
      useBERTScore,
      templatePath,
      fullContent: options.fullContent,
    });

    if (options.test) {
      console.log('Testing backend connectivity...');
      const testResult = await runner.testBackend();

      if (testResult.connected) {
        console.log('Backend is connected and ready');
      } else {
        console.error('Backend connection failed:', testResult.error);
        process.exit(1);
      }

      if (useBERTScore) {
        console.log('\nTesting BERTScore availability...');
        const bertScoreTest = await runner.testBERTScore();

        if (bertScoreTest.available) {
          console.log('BERTScore is available and working');
        } else {
          console.error('BERTScore test failed:', bertScoreTest.error);
          console.error('Evaluation will fall back to token-based F1 scores');
        }
      }

      process.exit(0);
    }

    console.log('Starting frontend-exact evaluation...');
    console.log(`Dataset: ${options.dataset}`);
    console.log(`Output: ${options.output}`);
    console.log(`Template: ${templatePath || '(default)'}`);
    console.log(`Mode: ${options.mode || 'per-question'}`);
    console.log(`Backend: ${options.backend || 'http://localhost:5001'}`);
    console.log(`Model: ${options.model || 'from .env'}`);
    console.log(
      `BERTScore: ${useBERTScore ? 'enabled' : 'disabled (use USE_BERTSCORE=true to enable)'}`
    );

    if (options.offset) {
      console.log(`Offset: ${options.offset} papers`);
    }
    if (options.limit) {
      console.log(`Limit: ${options.limit} papers`);
    }
    if (options.modelTag) {
      console.log(`Model Tag: ${options.modelTag}`);
    }

    // Batch mode
    if (options.mode === 'batch') {
      console.log(`\nRunning in BATCH mode (single LLM call per paper)\n`);

      const batchRunner = new BatchEvaluationRunner(options.backend, {
        useBERTScore,
        templatePath,
      });

      const summary = await batchRunner.runBatchEvaluation(
        options.dataset,
        options.output,
        {
          limit: options.limit,
          offset: options.offset,
          modelTag: options.modelTag || options.model,
          backendUrl: options.backend,
          onlyQuestions: options.onlyQuestions,
          skipExisting: options.skipExisting,
        }
      );

      console.log('\nBatch evaluation completed!');
      console.log(
        `Papers: ${summary.successfulPapers}/${summary.totalPapers} successful`
      );
      console.log(
        `Questions: ${summary.successfulQuestions}/${summary.totalQuestions} successful`
      );
      process.exit(0);
    }

    // Per-question mode (default)
    console.log(
      `Sibling Context: ${options.withContext ? 'enabled' : 'disabled'}`
    );

    if (useBERTScore) {
      console.log('\nVerifying BERTScore availability...');
      const bertScoreTest = await runner.testBERTScore();

      if (bertScoreTest.available) {
        console.log('✓ BERTScore is ready');
      } else {
        console.warn('⚠ BERTScore test failed:', bertScoreTest.error);
        console.warn(
          '  Evaluation will continue with token-based F1 scores as fallback'
        );
      }
    }

    const summary = await runner.runEvaluation(
      options.dataset,
      options.output,
      {
        limit: options.limit,
        offset: options.offset,
        modelTag: options.modelTag || options.model,
        withContext: options.withContext,
        backendUrl: options.backend,
        skipExisting: options.skipExisting,
        onlyQuestions: options.onlyQuestions,
      }
    );

    console.log('\nEvaluation completed successfully!');
    console.log(`Final Results:`);
    console.log(
      `Papers: ${summary.successfulPapers}/${summary.totalPapers} successful`
    );
    console.log(
      `Questions: ${summary.successfulQuestions}/${summary.totalQuestions} successful`
    );

    process.exit(0);
  } catch (error) {
    console.error(
      '\n✗ Evaluation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

export { main };
