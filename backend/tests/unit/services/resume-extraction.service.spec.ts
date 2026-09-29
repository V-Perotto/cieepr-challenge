import { pino } from 'pino';
import { describe, expect, it, vi } from 'vitest';
import {
  FileRequiredError,
  InvalidFileTypeError,
  PdfUnreadableError,
  type PdfUnreadableReason,
} from '../../../src/domain/errors.js';
import { PdfExtractionError, type PdfTextExtractor } from '../../../src/extraction/pdf-text-extractor.js';
import { ResumeExtractionService } from '../../../src/services/resume-extraction.service.js';

const pdfFile = (body = 'conteúdo') => {
  const buffer = Buffer.from(`%PDF-1.7\n${body}`);
  return { buffer, size: buffer.length };
};

function fakeExtractor(impl: PdfTextExtractor['extract']): PdfTextExtractor {
  return { extract: vi.fn(impl) };
}

function createService(extractor: PdfTextExtractor, timeoutMs = 1000) {
  const logs: unknown[] = [];
  const logger = pino({ level: 'info' }, { write: (line: string) => logs.push(JSON.parse(line)) });
  const service = new ResumeExtractionService(extractor, logger, { timeoutMs, maxPages: 5 });
  return { service, logs };
}

async function expectUnreadable(promise: Promise<unknown>, reason: PdfUnreadableReason) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(PdfUnreadableError);
  expect((error as PdfUnreadableError).reason).toBe(reason);
}

describe('ResumeExtractionService', () => {
  it('sem arquivo → FileRequiredError', async () => {
    const { service } = createService(fakeExtractor(async () => ({ text: '', pagesRead: 0 })));
    await expect(service.extract(undefined)).rejects.toBeInstanceOf(FileRequiredError);
  });

  it('sem a assinatura %PDF- nos primeiros 1024 bytes → InvalidFileTypeError, sem chamar o extrator', async () => {
    const extractor = fakeExtractor(async () => ({ text: 'x', pagesRead: 1 }));
    const { service } = createService(extractor);
    const zip = Buffer.from('PK\u0003\u0004 não é pdf');
    await expect(service.extract({ buffer: zip, size: zip.length })).rejects.toBeInstanceOf(InvalidFileTypeError);
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('aceita a assinatura depois de bytes iniciais (até 1024)', async () => {
    const { service } = createService(fakeExtractor(async () => ({ text: 'Maria Souza', pagesRead: 1 })));
    const buffer = Buffer.concat([Buffer.alloc(100, 0x20), Buffer.from('%PDF-1.4')]);
    await expect(service.extract({ buffer, size: buffer.length })).resolves.toBeDefined();
  });

  it('texto vazio ou só espaços → no_text', async () => {
    const { service } = createService(fakeExtractor(async () => ({ text: ' \n\n ', pagesRead: 1 })));
    await expectUnreadable(service.extract(pdfFile()), 'no_text');
  });

  it.each(['encrypted', 'corrupted'] as const)('PdfExtractionError(%s) → PdfUnreadableError(%s)', async (reason) => {
    const { service } = createService(
      fakeExtractor(async () => {
        throw new PdfExtractionError(reason);
      }),
    );
    await expectUnreadable(service.extract(pdfFile()), reason);
  });

  it('extração que não termina no prazo → timeout', async () => {
    const { service } = createService(
      fakeExtractor(() => new Promise(() => undefined)),
      50,
    );
    await expectUnreadable(service.extract(pdfFile()), 'timeout');
  });

  it('sucesso parcial: preenche identified/notIdentified e repassa pagesRead', async () => {
    const { service } = createService(
      fakeExtractor(async () => ({ text: 'Maria Souza\nmaria@example.com', pagesRead: 2 })),
    );
    expect(await service.extract(pdfFile())).toEqual({
      fields: { fullName: 'Maria Souza', email: 'maria@example.com', phone: null },
      identified: ['fullName', 'email'],
      notIdentified: ['phone'],
      pagesRead: 2,
    });
  });

  it('passa ao extrator o limite de 5 páginas', async () => {
    const extractor = fakeExtractor(async () => ({ text: 'Maria Souza', pagesRead: 1 }));
    const { service } = createService(extractor);
    await service.extract(pdfFile());
    expect(extractor.extract).toHaveBeenCalledWith(expect.any(Uint8Array), { maxPages: 5 });
  });

  it('não registra no log os valores dos campos nem o texto extraído (LGPD)', async () => {
    const text = 'Conceição Aparecida da Silva\nconceicao@example.com\n(41) 99876-5432';
    const { service, logs } = createService(fakeExtractor(async () => ({ text, pagesRead: 1 })));
    await service.extract(pdfFile());
    await expectUnreadable(
      createService(fakeExtractor(async () => ({ text: '', pagesRead: 1 }))).service.extract(pdfFile()),
      'no_text',
    );

    const serialized = JSON.stringify(logs);
    expect(logs.length).toBeGreaterThan(0);
    expect(serialized).not.toContain('Conceição');
    expect(serialized).not.toContain('conceicao@example.com');
    expect(serialized).not.toContain('99876');
    expect(serialized).toContain('"identified":["fullName","email","phone"]');
  });
});
