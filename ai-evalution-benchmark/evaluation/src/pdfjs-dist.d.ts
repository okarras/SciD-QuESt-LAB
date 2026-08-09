declare module 'pdfjs-dist/legacy/build/pdf.js' {
  export function getDocument(params: { data: Uint8Array; standardFontDataUrl?: string }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNum: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str: string; [key: string]: any }>;
        }>;
      }>;
    }>;
  };
}
