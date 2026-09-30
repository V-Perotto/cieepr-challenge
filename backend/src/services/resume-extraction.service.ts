import type { ResumeExtractionResult, ResumeField } from '../domain/candidate.js';
import {
  FileRequiredError,
  InvalidFileTypeError,
  PdfUnreadableError,
  type PdfUnreadableReason,
} from '../domain/errors.js';
import { type ExtractedText, PdfExtractionError, type PdfTextExtractor } from '../extraction/pdf-text-extractor.js';
import { parseResumeFields } from '../extraction/resume-field-parser.js';
import type { Logger } from '../logger.js';

export interface UploadedFile {
  buffer: Buffer;
  size: number;
}

export interface ResumeExtractionOptions {
  timeoutMs: number;
  maxPages: number;
}

const RESUME_FIELDS: readonly ResumeField[] = ['fullName', 'email', 'phone'];
const PDF_SIGNATURE = '%PDF-';
const SIGNATURE_WINDOW = 1024;

class ExtractionTimeoutError extends Error {}

/**
 * Lê um currículo PDF em memória e sugere Nome, E-mail e Telefone. O arquivo nunca é gravado
 * nem guardado depois do processamento (FR-024), e os logs não contêm dados pessoais.
 */
export class ResumeExtractionService {
  constructor(
    private readonly extractor: PdfTextExtractor,
    private readonly logger: Logger,
    private readonly options: ResumeExtractionOptions,
  ) {}

  async extract(file: UploadedFile | undefined): Promise<ResumeExtractionResult> {
    if (!file) throw new FileRequiredError();
    // Verifica o conteúdo, não a extensão: o pdf.js aceita a assinatura nos primeiros 1024 bytes.
    if (!file.buffer.subarray(0, SIGNATURE_WINDOW).includes(PDF_SIGNATURE)) throw new InvalidFileTypeError();

    const startedAt = performance.now();
    try {
      const { text, pagesRead } = await this.readWithTimeout(new Uint8Array(file.buffer));
      if (text.trim().length === 0) throw new PdfUnreadableError('no_text');

      const fields = parseResumeFields(text);
      const identified = RESUME_FIELDS.filter((f) => fields[f] !== null);
      const notIdentified = RESUME_FIELDS.filter((f) => fields[f] === null);

      this.log({ outcome: 'success', identified, pagesRead, sizeBytes: file.size, startedAt });
      return { fields, identified, notIdentified, pagesRead };
    } catch (err) {
      const reason = this.failureReason(err);
      if (!reason) throw err;
      this.log({ outcome: 'failure', reason, sizeBytes: file.size, startedAt });
      throw new PdfUnreadableError(reason);
    }
  }

  private async readWithTimeout(data: Uint8Array): Promise<ExtractedText> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ExtractionTimeoutError()), this.options.timeoutMs);
    });
    try {
      return await Promise.race([this.extractor.extract(data, { maxPages: this.options.maxPages }), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private failureReason(err: unknown): PdfUnreadableReason | null {
    if (err instanceof PdfUnreadableError) return err.reason ?? null;
    if (err instanceof PdfExtractionError) return err.reason;
    if (err instanceof ExtractionTimeoutError) return 'timeout';
    return null;
  }

  /** Só metadados: nenhum texto do PDF nem valor de campo (LGPD). */
  private log(entry: {
    outcome: 'success' | 'failure';
    reason?: PdfUnreadableReason;
    identified?: ResumeField[];
    pagesRead?: number;
    sizeBytes: number;
    startedAt: number;
  }): void {
    const { startedAt, ...rest } = entry;
    this.logger.info(
      { event: 'resume_extraction', ...rest, durationMs: Math.round(performance.now() - startedAt) },
      'extração de currículo',
    );
  }
}
