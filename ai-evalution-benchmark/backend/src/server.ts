import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { AIService, type AIConfig } from './aiService.js';
import { backendSemanticChunker } from './semanticChunker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper to sanitize env vars (remove surrounding quotes)
const sanitizeEnvVar = (
  value: string | undefined,
  defaultValue: string
): string => {
  if (!value) return defaultValue;
  return value.trim().replace(/^["']|["']$/g, '');
};

// Initialize AI service (OpenRouter only)
const aiConfig: AIConfig = {
  openrouterApiKey: sanitizeEnvVar(process.env.OPENROUTER_API_KEY, ''),
  openrouterModel: sanitizeEnvVar(
    process.env.OPENROUTER_MODEL,
    'openai/gpt-4o-mini'
  ),
};

const aiService = new AIService(aiConfig);

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: aiService.isConfigured(),
    model: aiConfig.openrouterModel,
  });
});

/**
 * POST /api/ai/generate
 * Generate text using AI via OpenRouter
 */
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, model, temperature, maxTokens, systemContext } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res
        .status(400)
        .json({ error: 'Prompt is required and must be a string' });
    }

    if (prompt.length > 100000) {
      return res
        .status(400)
        .json({ error: 'Prompt too long (max 100000 characters)' });
    }

    if (
      temperature !== undefined &&
      (typeof temperature !== 'number' || temperature < 0 || temperature > 2)
    ) {
      return res
        .status(400)
        .json({ error: 'Temperature must be a number between 0 and 2' });
    }

    if (
      maxTokens !== undefined &&
      (typeof maxTokens !== 'number' || maxTokens < 1 || maxTokens > 200000)
    ) {
      return res
        .status(400)
        .json({ error: 'Max tokens must be a number between 1 and 200000' });
    }

    const result = await aiService.generateText({
      prompt,
      model,
      temperature,
      maxTokens,
      systemContext,
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating text:', error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes('API key') ||
      errorMessage.includes('not configured')
    ) {
      return res.status(500).json({
        error: 'AI service not properly configured. Check OPENROUTER_API_KEY.',
        details: errorMessage,
      });
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return res
        .status(429)
        .json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({
      error: 'Failed to generate text',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/ai/semantic-chunks
 * Find relevant PDF chunks for a question using semantic similarity
 */
app.post('/api/ai/semantic-chunks', async (req, res) => {
  try {
    const { question, pages, maxTokens = 4000 } = req.body;

    if (!question || typeof question !== 'string') {
      return res
        .status(400)
        .json({ error: 'Question is required and must be a string' });
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      return res
        .status(400)
        .json({ error: 'Pages array is required and must not be empty' });
    }

    for (const page of pages) {
      if (
        typeof page.pageNumber !== 'number' ||
        typeof page.text !== 'string'
      ) {
        return res.status(400).json({
          error: 'Each page must have pageNumber (number) and text (string)',
        });
      }
    }

    console.log(
      `[API] Semantic chunking: ${pages.length} pages, question length: ${question.length}`
    );

    const relevantChunks = await backendSemanticChunker.findRelevantChunks(
      question,
      pages,
      maxTokens
    );

    const totalTokens = relevantChunks.reduce(
      (sum, chunk) => sum + chunk.tokenEstimate,
      0
    );

    console.log(
      `[API] Returning ${relevantChunks.length} chunks (${totalTokens} tokens)`
    );

    res.json({
      chunks: relevantChunks.map((chunk) => ({
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        similarity: chunk.similarity,
        tokenEstimate: chunk.tokenEstimate,
      })),
      totalTokens,
      totalChunks: relevantChunks.length,
    });
  } catch (error) {
    console.error('[API] Semantic chunking error:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    res.status(500).json({
      error: 'Failed to perform semantic chunking',
      details: errorMessage,
    });
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 AI Evaluation Backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   AI configured: ${aiService.isConfigured()}`);
  console.log(`   Model: ${aiConfig.openrouterModel}`);
  console.log('');
});

export default app;
