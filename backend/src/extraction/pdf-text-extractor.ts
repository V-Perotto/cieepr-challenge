import { getDocumentProxy } from 'unpdf';

export interface ExtractedText {
  text: string;
  pagesRead: number;
}

/** Porta de leitura de texto de PDF. A implementação concreta fica isolada aqui (research R3). */
export interface PdfTextExtractor {
  extract(data: Uint8Array, options: { maxPages: number }): Promise<ExtractedText>;
}

export type PdfExtractionFailure = 'encrypted' | 'corrupted';

export class PdfExtractionError extends Error {
  constructor(readonly reason: PdfExtractionFailure) {
    super(`falha ao ler o PDF: ${reason}`);
    this.name = 'PdfExtractionError';
  }
}

function toExtractionError(err: unknown): PdfExtractionError {
  const name = err instanceof Error ? err.name : '';
  // pdf.js sinaliza PDF com senha por PasswordException; o resto é estrutura inválida ou ilegível.
  return new PdfExtractionError(name === 'PasswordException' ? 'encrypted' : 'corrupted');
}

/** Extrai o texto com o pdf.js (via unpdf), página a página, na ordem de leitura. */
export class UnpdfTextExtractor implements PdfTextExtractor {
  async extract(data: Uint8Array, { maxPages }: { maxPages: number }): Promise<ExtractedText> {
    // O pdf.js assume a posse do buffer; passamos uma cópia para não afetar quem chamou.
    const pdf = await getDocumentProxy(new Uint8Array(data)).catch((err: unknown) => {
      throw toExtractionError(err);
    });

    try {
      const pagesRead = Math.min(pdf.numPages, maxPages);
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pagesRead; pageNumber++) {
        const content = await (await pdf.getPage(pageNumber)).getTextContent();
        let pageText = '';
        for (const item of content.items) {
          if ('str' in item) pageText += item.str + (item.hasEOL ? '\n' : '');
        }
        pages.push(pageText);
      }
      return { text: pages.join('\n'), pagesRead };
    } catch (err) {
      throw toExtractionError(err);
    } finally {
      await pdf.loadingTask.destroy();
    }
  }
}
