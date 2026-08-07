import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = false;

interface PageContent {
  pageNumber: number;
  text: string;
  wordCount: number;
}

interface SemanticChunk {
  text: string;
  pageNumber: number;
  startIndex: number;
  endIndex: number;
  tokenEstimate: number;
}

interface SemanticChunkWithScore extends SemanticChunk {
  similarity: number;
}

class BackendSemanticChunker {
  private model: any = null;
  private modelLoading: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (this.modelLoading) return this.modelLoading;

    console.log('[SemanticChunker] Initializing model...');
    this.modelLoading = (async () => {
      try {
        this.model = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          { quantized: true }
        );
        console.log('[SemanticChunker] Model loaded successfully');
      } catch (error) {
        console.error('[SemanticChunker] Model initialization failed:', error);
        this.modelLoading = null;
        throw error;
      }
    })();

    await this.modelLoading;
  }

  private splitIntoChunks(pages: PageContent[]): SemanticChunk[] {
    const chunks: SemanticChunk[] = [];
    const targetChunkSize = 2000;
    const overlapSize = 400;

    for (const page of pages) {
      const sentences = page.text.split(/(?<=[.!?])(?=\s)/);
      let currentChunk = '';
      let startIndex = 0;

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if (
          currentChunk &&
          currentChunk.length + trimmedSentence.length + 1 > targetChunkSize
        ) {
          chunks.push({
            text: currentChunk.trim(),
            pageNumber: page.pageNumber,
            startIndex,
            endIndex: startIndex + currentChunk.length,
            tokenEstimate: Math.ceil(currentChunk.length / 4),
          });

          const words = currentChunk.trim().split(/\s+/);
          const overlapWords = words.slice(-Math.ceil(overlapSize / 5));
          currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
          startIndex += currentChunk.length - overlapSize;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
        }
      }

      if (currentChunk.trim()) {
        chunks.push({
          text: currentChunk.trim(),
          pageNumber: page.pageNumber,
          startIndex,
          endIndex: startIndex + currentChunk.length,
          tokenEstimate: Math.ceil(currentChunk.length / 4),
        });
      }
    }

    console.log(
      `[SemanticChunker] Created ${chunks.length} chunks from ${pages.length} pages`
    );
    return chunks;
  }

  private async embed(text: string): Promise<number[]> {
    const output = await this.model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async findRelevantChunks(
    question: string,
    pages: PageContent[],
    maxTokens: number = 4000
  ): Promise<SemanticChunkWithScore[]> {
    console.log(
      `[SemanticChunker] Finding relevant chunks (max ${maxTokens} tokens)`
    );

    await this.initialize();

    const chunks = this.splitIntoChunks(pages);

    console.log(`[SemanticChunker] Generating embeddings...`);
    const chunkEmbeddings = await Promise.all(
      chunks.map((chunk) => this.embed(chunk.text))
    );

    const questionEmbedding = await this.embed(question);

    const scored: SemanticChunkWithScore[] = chunks.map((chunk, i) => ({
      ...chunk,
      similarity: this.cosineSimilarity(questionEmbedding, chunkEmbeddings[i]),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    const selected: SemanticChunkWithScore[] = [];
    let tokenCount = 0;

    for (const chunk of scored) {
      if (tokenCount + chunk.tokenEstimate <= maxTokens) {
        selected.push(chunk);
        tokenCount += chunk.tokenEstimate;
      }
    }

    console.log(
      `[SemanticChunker] Selected ${selected.length} chunks (${tokenCount} tokens)`
    );

    selected.sort((a, b) => a.pageNumber - b.pageNumber);
    return selected;
  }
}

export const backendSemanticChunker = new BackendSemanticChunker();
