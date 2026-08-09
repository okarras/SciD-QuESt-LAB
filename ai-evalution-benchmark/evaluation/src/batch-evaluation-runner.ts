/**
 * Batch Evaluation Runner - Evaluates all questions for a paper in a single LLM call
 *
 * This is an additional evaluation mode that sends the full PDF content + all questions
 * to the LLM at once, then parses the structured response. Uses the same metrics
 * calculator as the per-question mode for fair comparison.
 */

import * as fs from 'fs';
import * as path from 'path';

import { FrontendPDFExtractor } from './pdf-content-extractor';
import { FrontendTemplateLoader } from './template-loader';
import { GroundTruthMapper } from './ground-truth-mapper';
import { BatchPromptAssembler, type BatchPrompt } from './batch-prompt-assembler';
import { BatchResponseParser } from './batch-response-parser';
import { FrontendBackendCaller } from './backend-service-caller';
import {
  SimpleMetricsCalculator,
  type QuestionResult,
  type EvaluationSummary as SimpleEvaluationSummary,
  type Suggestion,
} from './simple-metrics-calculator';
import { EvalConfigLoader } from './eval-config-loader';
import type { EvalConfig } from './eval-config-loader';
import type {
  EvaluationQuestion,
  EvaluationResult,
  PaperEvaluationResult,
  EvaluationSummary,
} from './evaluation-runner';

export class BatchEvaluationRunner {
  private pdfExtractor: FrontendPDFExtractor;
  private templateLoader: FrontendTemplateLoader;
  private groundTruthMapper: GroundTruthMapper;
  private batchPromptAssembler: BatchPromptAssembler;
  private batchResponseParser: BatchResponseParser;
  private backendCaller: FrontendBackendCaller;
  private metricsCalculator: SimpleMetricsCalculator;
  private evalConfig: EvalConfig;

  constructor(
    backendUrl: string = 'http://localhost:5001',
    options: { useBERTScore?: boolean; templatePath?: string } = {}
  ) {
    this.templateLoader = new FrontendTemplateLoader(options.templatePath);
    const evalConfigLoader = this.templateLoader.getEvalConfigLoader();
    this.evalConfig = evalConfigLoader.load();

    this.pdfExtractor = new FrontendPDFExtractor(backendUrl);
    this.groundTruthMapper = new GroundTruthMapper(this.evalConfig);
    this.batchPromptAssembler = new BatchPromptAssembler(this.evalConfig);
    this.batchResponseParser = new BatchResponseParser();
    this.backendCaller = new FrontendBackendCaller(backendUrl);
    this.metricsCalculator = new SimpleMetricsCalculator({
      useBERTScore: options.useBERTScore,
      evalConfig: this.evalConfig,
    });
  }

  async evaluatePaperBatch(
    paperId: string,
    title: string,
    pdfPath: string,
    questions: EvaluationQuestion[]
  ): Promise<PaperEvaluationResult> {
    const startTime = Date.now();

    console.log(`\n=== [BATCH] Evaluating Paper: ${paperId} ===`);
    console.log(`Title: ${title}`);
    console.log(`PDF: ${pdfPath}`);
    console.log(`Questions: ${questions.length} (single LLM call)`);

    try {
      // Step 1: Extract full PDF content
      console.log('Step 1: Extracting full PDF content...');
      const baseResult = await this.pdfExtractor.extractPDFContent(pdfPath);

      if (!baseResult.success || !baseResult.pdfContent) {
        throw new Error(`PDF extraction failed: ${baseResult.error}`);
      }

      const fullContent = baseResult.structuredDocument
        ? baseResult.structuredDocument.pages
            .map((p) => `[PAGE ${p.pageNumber}]\n${p.text}`)
            .join('\n\n')
        : baseResult.pdfContent;

      console.log(
        `PDF extracted: ${baseResult.metadata.totalPages} pages, ${fullContent.length} chars`
      );

      // Step 2: Assemble batch prompt
      console.log('Step 2: Assembling batch prompt...');
      const batchPrompt = this.batchPromptAssembler.assembleBatchPrompt(
        questions,
        fullContent,
        title
      );

      const tokenEstimate = this.batchPromptAssembler.estimateTokenUsage(
        questions,
        fullContent
      );
      console.log(
        `Prompt: ${batchPrompt.metadata.promptLength} chars (~${tokenEstimate.inputTokens} input tokens)`
      );
      console.log(
        `Expected response: ~${tokenEstimate.outputTokens} tokens`
      );

      // Step 3: Call LLM (single call)
      console.log('Step 3: Calling LLM (single batch call)...');
      const backendResult = await this.backendCaller.callBackendService(
        {
          systemPrompt: batchPrompt.systemPrompt,
          userPrompt: batchPrompt.userPrompt,
          temperature: batchPrompt.temperature,
          maxTokens: batchPrompt.maxTokens,
          metadata: batchPrompt.metadata as any,
        },
        'batch',
        fullContent,
        undefined
      );

      if (!backendResult.success) {
        throw new Error(`Backend call failed: ${backendResult.error}`);
      }

      console.log(
        `LLM responded in ${backendResult.metadata.duration}ms`
      );

      // Step 4: Parse batch response
      // The rawResponse from the backend is JSON: {"text":"...", "usage":{...}}
      // We need the "text" field which contains the LLM's actual output
      console.log('Step 4: Parsing batch response...');
      const questionIds = questions.map((q) => q.id);

      let llmTextOutput = backendResult.llmInteraction.rawResponse;
      try {
        const rawParsed = JSON.parse(llmTextOutput);
        if (rawParsed.text) {
          llmTextOutput = rawParsed.text;
        }
      } catch {
        // rawResponse is already the text itself
      }

      const parseResult = this.batchResponseParser.parseBatchResponse(
        llmTextOutput,
        questionIds
      );

      console.log(
        `Parsed: ${parseResult.totalParsed}/${questions.length} questions (${parseResult.totalFailed} failed)`
      );

      if (parseResult.error) {
        console.log(`Parse warning: ${parseResult.error}`);
      }

      // Step 5: Score each question
      console.log('Step 5: Computing metrics...');
      const evaluationResults: EvaluationResult[] = [];

      for (const question of questions) {
        const parsedAnswer = parseResult.answers.find(
          (a) => a.questionId === question.id
        );

        if (!parsedAnswer || !parsedAnswer.parseSuccess) {
          evaluationResults.push({
            questionId: question.id,
            questionText: question.text,
            questionType: question.type,
            prediction: '',
            suggestions: [],
            groundTruth: question.groundTruth,
            success: false,
            confidence: 0,
            evidence: [],
            processingTime: 0,
            error: parsedAnswer?.error || 'Not found in batch response',
            metadata: {
              promptLength: batchPrompt.metadata.promptLength,
              pdfContentLength: fullContent.length,
              backendDuration: backendResult.metadata.duration,
            },
            llmInteraction: backendResult.llmInteraction,
            metrics: undefined,
          });
          continue;
        }

        const suggestions = parsedAnswer.suggestions;
        const predictionText =
          suggestions.length > 0 ? suggestions[0].text : '';
        const prediction =
          typeof predictionText === 'string'
            ? predictionText
            : Array.isArray(predictionText)
              ? (predictionText as string[]).join(', ')
              : String(predictionText);
        const confidence =
          suggestions.length > 0 ? suggestions[0].confidence : 0;
        const evidence =
          suggestions.length > 0 ? suggestions[0].evidence : [];

        const metrics = await this.metricsCalculator.calculateQuestionMetrics(
          suggestions,
          question.groundTruth,
          question.type,
          question.id
        );

        evaluationResults.push({
          questionId: question.id,
          questionText: question.text,
          questionType: question.type,
          prediction,
          suggestions,
          groundTruth: question.groundTruth,
          success: true,
          confidence,
          evidence,
          processingTime: backendResult.metadata.duration,
          metadata: {
            promptLength: batchPrompt.metadata.promptLength,
            pdfContentLength: fullContent.length,
            backendDuration: backendResult.metadata.duration,
          },
          llmInteraction: backendResult.llmInteraction,
          metrics,
        });
      }

      const totalTime = Date.now() - startTime;
      const successful = evaluationResults.filter((r) => r.success).length;
      console.log(
        `Paper completed in ${totalTime}ms (${successful}/${questions.length} questions successful)`
      );

      return {
        paperId,
        title,
        pdfPath,
        questions: evaluationResults,
        pdfMetadata: {
          filename: baseResult.metadata.filename,
          totalPages: baseResult.metadata.totalPages,
          totalWords: baseResult.metadata.totalWords,
        },
        processingTime: totalTime,
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.log(
        `Paper failed: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        paperId,
        title,
        pdfPath,
        questions: [],
        pdfMetadata: { filename: '', totalPages: 0, totalWords: 0 },
        processingTime: totalTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  loadQuestionsFromTemplate(): EvaluationQuestion[] {
    const templateQuestions = this.templateLoader.getEvaluationQuestions();
    return templateQuestions.map((templateQ) => ({
      id: templateQ.id,
      text: templateQ.label,
      type: templateQ.type,
      options: templateQ.options,
      groundTruth: null,
    }));
  }

  mapQuestionsToGroundTruth(
    questions: EvaluationQuestion[],
    metadata: any
  ): EvaluationQuestion[] {
    return this.groundTruthMapper.mapQuestionsToGroundTruth(questions, metadata);
  }

  async loadPapersFromDataset(
    datasetPath: string,
    limit?: number,
    offset?: number
  ): Promise<Array<{ paperId: string; title: string; pdfPath: string; metadata: any }>> {
    const indexPath = path.join(datasetPath, 'dataset_index.json');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Dataset index not found: ${indexPath}`);
    }

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const allPapers = index.papers || [];

    const validPapers = [];
    for (const paperInfo of allPapers) {
      const paperId = paperInfo.paper_id?.split('/').pop() || paperInfo.id;
      const paperDir = path.join(datasetPath, paperId);
      const metadataPath = path.join(paperDir, 'metadata.json');
      const pdfPath = path.join(paperDir, 'paper.pdf');

      if (fs.existsSync(metadataPath) && fs.existsSync(pdfPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        validPapers.push({
          paperId,
          title: metadata.title || paperId,
          pdfPath,
          metadata,
        });
      }
    }

    const start = offset || 0;
    let loadedPapers = validPapers;
    if (limit) {
      loadedPapers = validPapers.slice(start, start + limit);
    } else if (start > 0) {
      loadedPapers = validPapers.slice(start);
    }

    console.log(
      `Found ${validPapers.length} valid papers, loaded ${loadedPapers.length} (offset: ${start}, limit: ${limit || 'all'})`
    );
    return loadedPapers;
  }

  async runBatchEvaluation(
    datasetPath: string,
    outputPath: string,
    options: {
      limit?: number;
      offset?: number;
      modelTag?: string;
      backendUrl?: string;
      onlyQuestions?: string[];
    } = {}
  ): Promise<EvaluationSummary> {
    const startTime = Date.now();

    console.log('='.repeat(80));
    console.log('BATCH EVALUATION RUNNER (single call per paper)');
    console.log('='.repeat(80));
    console.log(`Template: ${this.templateLoader.getTemplatePath()}`);
    console.log(`Dataset: ${datasetPath}`);
    console.log(`Output: ${outputPath}`);

    const papers = await this.loadPapersFromDataset(
      datasetPath,
      options.limit,
      options.offset
    );

    if (papers.length === 0) {
      throw new Error('No papers found in dataset');
    }

    const results: PaperEvaluationResult[] = [];

    for (let i = 0; i < papers.length; i++) {
      const paper = papers[i];
      console.log(`\n[${i + 1}/${papers.length}] Processing ${paper.paperId}`);

      const templateQuestions = this.loadQuestionsFromTemplate();
      let allQuestions = this.mapQuestionsToGroundTruth(
        templateQuestions,
        paper.metadata
      );

      if (allQuestions.length === 0) {
        console.log(`  Skipping - no questions with ground truth`);
        continue;
      }

      if (options.onlyQuestions && options.onlyQuestions.length > 0) {
        allQuestions = allQuestions.filter((q) =>
          options.onlyQuestions!.includes(q.id)
        );
        if (allQuestions.length === 0) continue;
      }

      const result = await this.evaluatePaperBatch(
        paper.paperId,
        paper.title,
        paper.pdfPath,
        allQuestions
      );

      results.push(result);
    }

    const summary = this.calculateSummary(results);

    const finalResults = {
      timestamp: new Date().toISOString(),
      configuration: {
        datasetPath,
        templatePath: this.templateLoader.getTemplatePath(),
        templateId: this.evalConfig.template_id,
        offset: options.offset || 0,
        limit: options.limit,
        modelTag: options.modelTag || null,
        evaluationType: 'batch',
        evaluationMode: 'single-call-per-paper',
      },
      summary,
      results,
    };

    fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2));

    const totalTime = Date.now() - startTime;
    console.log('\n' + '='.repeat(80));
    console.log('BATCH EVALUATION COMPLETE');
    console.log('='.repeat(80));
    console.log(
      `Papers: ${summary.totalPapers} (${summary.successfulPapers} ok, ${summary.failedPapers} failed)`
    );
    console.log(
      `Questions: ${summary.totalQuestions} (${summary.successfulQuestions} ok, ${summary.failedQuestions} failed)`
    );
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(
      `Avg per paper: ${(totalTime / Math.max(results.length, 1) / 1000).toFixed(2)}s`
    );
    console.log(`Results saved to: ${outputPath}`);

    return summary;
  }

  private calculateSummary(results: PaperEvaluationResult[]): EvaluationSummary {
    let totalQuestions = 0;
    let successfulQuestions = 0;
    let failedQuestions = 0;
    let totalProcessingTime = 0;

    const allQuestionResults: QuestionResult[] = [];

    for (const result of results) {
      totalProcessingTime += result.processingTime;
      for (const question of result.questions) {
        totalQuestions++;
        if (question.success) {
          successfulQuestions++;
          if (question.metrics) {
            allQuestionResults.push(question.metrics);
          }
        } else {
          failedQuestions++;
        }
      }
    }

    const simpleMetrics =
      this.metricsCalculator.calculateSummaryMetrics(allQuestionResults);

    return {
      totalPapers: results.length,
      successfulPapers: results.filter((r) => !r.error).length,
      failedPapers: results.filter((r) => r.error).length,
      totalQuestions,
      successfulQuestions,
      failedQuestions,
      averageProcessingTime:
        results.length > 0 ? totalProcessingTime / results.length : 0,
      simpleMetrics,
    };
  }

  async testBackend(): Promise<{ connected: boolean; error?: string }> {
    return this.backendCaller.testConnection();
  }
}
