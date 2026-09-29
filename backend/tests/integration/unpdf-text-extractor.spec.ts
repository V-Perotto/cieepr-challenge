import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { PdfExtractionError, UnpdfTextExtractor } from '../../src/extraction/pdf-text-extractor.js';
import { ResumeExtractionService } from '../../src/services/resume-extraction.service.js';

const SAMPLES_DIR = fileURLToPath(new URL('../../../samples/', import.meta.url));

interface Expected {
  success: Record<string, { fullName: string; email: string; phone: string | null }>;
}

const sample = async (name: string) => new Uint8Array(await readFile(`${SAMPLES_DIR}${name}`));
const extractor = new UnpdfTextExtractor();

async function extractionError(name: string): Promise<PdfExtractionError> {
  const error = await extractor.extract(await sample(name), { maxPages: 5 }).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(PdfExtractionError);
  return error as PdfExtractionError;
}

describe('UnpdfTextExtractor com os currículos de samples/', () => {
  it('01: texto na ordem de leitura, começando pelo nome', async () => {
    const { text, pagesRead } = await extractor.extract(await sample('01-layout-simples.pdf'), { maxPages: 5 });
    expect(text.split('\n')[0]).toBe('Conceição Aparecida da Silva');
    expect(pagesRead).toBe(1);
  });

  it('05: PDF sem texto devolve texto vazio', async () => {
    const { text } = await extractor.extract(await sample('05-digitalizado-sem-texto.pdf'), { maxPages: 5 });
    expect(text.trim()).toBe('');
  });

  it('06: PDF protegido por senha → encrypted', async () => {
    expect((await extractionError('06-protegido-por-senha.pdf')).reason).toBe('encrypted');
  });

  it('07: PDF truncado → corrupted', async () => {
    expect((await extractionError('07-corrompido.pdf')).reason).toBe('corrupted');
  });
});

describe('ResumeExtractionService real com samples/expected.json (SC-002)', () => {
  const service = new ResumeExtractionService(extractor, pino({ level: 'silent' }), { timeoutMs: 4000, maxPages: 5 });

  it('extrai os campos esperados de 01 a 04', async () => {
    const expected = JSON.parse(await readFile(`${SAMPLES_DIR}expected.json`, 'utf8')) as Expected;
    for (const [file, fields] of Object.entries(expected.success)) {
      const buffer = await readFile(`${SAMPLES_DIR}${file}`);
      const result = await service.extract({ buffer, size: buffer.length });
      expect(result.fields, file).toEqual(fields);
    }
  });
});
