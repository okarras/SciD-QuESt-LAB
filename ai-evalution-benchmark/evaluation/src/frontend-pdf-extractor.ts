/**
 * Frontend PDF Extractor - Uses pdfjs-dist for reliable text extraction
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PageContent {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface DocumentMetadata {
  filename: string;
  totalPages: number;
  totalWords: number;
  extractedAt: number;
}

export interface StructuredDocument {
  metadata: DocumentMetadata;
  pages: PageContent[];
  fullText: string;
}

export interface RetrievalResult {
  content: string;
  pages: number[];
  tokenEstimate: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class FrontendStructuredPDFExtractor {
  private documentCache: Map<string, StructuredDocument> = new Map();

  private pdfjsLib: any = null;

  private getPdfjsLib(): any {
    if (!this.pdfjsLib) {
      // pdfjs-dist v3 legacy build works in Node.js CJS
      this.pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    }
    return this.pdfjsLib;
  }

  private async parsePDFFile(pdfPath: string): Promise<{
    fullText: string;
    pages: PageContent[];
    numPages: number;
  }> {
    const pdfjsLib = this.getPdfjsLib();

    const standardFontDataUrl = path.resolve(
      __dirname,
      '../node_modules/pdfjs-dist/standard_fonts/'
    ) + '/';
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data, standardFontDataUrl }).promise;

    const pages: PageContent[] = [];
    let fullText = '';

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      let pageText = content.items
        .map((item: any) => item.str)
        .join(' ');

      pageText = pageText
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .replace(/\s+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const lines = pageText.split(/\n/);
      const filteredLines = lines.filter((line: string) => {
        const lower = line.toLowerCase().trim();
        if (lower.length > 200) return true;
        if (
          lower.includes('authorized licensed use') ||
          (lower.includes('downloaded on') && lower.includes('from ieee xplore')) ||
          (lower.includes('restrictions apply') && lower.length < 50) ||
          (lower.includes('technische informationsbibliothek') && lower.length < 150)
        ) {
          return false;
        }
        return true;
      });
      pageText = filteredLines.join('\n').trim();

      const wordCount = pageText
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length;

      pages.push({
        pageNumber: i,
        text: pageText,
        wordCount,
      });

      fullText += pageText + '\n\n';
    }

    fullText = fullText.trim();

    return {
      fullText,
      pages,
      numPages: doc.numPages,
    };
  }

  async extractStructuredDocument(
    pdfPath: string,
    filename?: string
  ): Promise<StructuredDocument> {
    const cached = this.documentCache.get(pdfPath);
    if (cached) return cached;

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    const pdfData = await this.parsePDFFile(pdfPath);
    const pages = pdfData.pages;

    const fullText = pages.map((p) => p.text).join('\n\n');
    const totalWords = fullText.split(/\s+/).filter((w) => w.length > 0).length;

    const document: StructuredDocument = {
      metadata: {
        filename: filename || path.basename(pdfPath),
        totalPages: pdfData.numPages,
        totalWords,
        extractedAt: Date.now(),
      },
      pages,
      fullText,
    };

    this.documentCache.set(pdfPath, document);
    return document;
  }

  getPageContent(
    document: StructuredDocument,
    pageNumbers: number[]
  ): RetrievalResult {
    const pages = document.pages.filter((p) =>
      pageNumbers.includes(p.pageNumber)
    );
    const content = pages
      .map((p) => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');

    return {
      content,
      pages: pageNumbers,
      tokenEstimate: estimateTokens(content),
    };
  }

  getFullContent(document: StructuredDocument): RetrievalResult {
    const content = document.pages
      .map((p) => `[PAGE ${p.pageNumber}]\n${p.text}`)
      .join('\n\n');

    return {
      content,
      pages: document.pages.map((p) => p.pageNumber),
      tokenEstimate: estimateTokens(content),
    };
  }

  clearCache(pdfUrl: string): void {
    this.documentCache.delete(pdfUrl);
  }

  clearAllCaches(): void {
    this.documentCache.clear();
  }
}
