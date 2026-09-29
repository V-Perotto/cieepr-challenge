import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { UnpdfTextExtractor } from '../../src/extraction/pdf-text-extractor.js';
import { ResumeExtractionService } from '../../src/services/resume-extraction.service.js';
import { createTestApp } from './test-app.js';

const SAMPLES_DIR = fileURLToPath(new URL('../../../samples/', import.meta.url));
const MAX_BYTES = 5_242_880;

describe('POST /api/resume-extractions', () => {
  let app: Express;

  beforeAll(() => {
    const service = new ResumeExtractionService(new UnpdfTextExtractor(), pino({ level: 'silent' }), {
      timeoutMs: 4000,
      maxPages: 5,
    });
    app = createTestApp({ resumeExtractionService: service });
  });

  const upload = (buffer: Buffer, filename = 'curriculo.pdf') =>
    request(app).post('/api/resume-extractions').attach('file', buffer, filename);

  it('200 no formato ResumeExtractionResult para o sample 01', async () => {
    const res = await upload(await readFile(`${SAMPLES_DIR}01-layout-simples.pdf`));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      fields: {
        fullName: 'Conceição Aparecida da Silva',
        email: 'conceicao.silva@example.com',
        phone: '41998765432',
      },
      identified: ['fullName', 'email', 'phone'],
      notIdentified: [],
      pagesRead: 1,
    });
  });

  it('400 FILE_REQUIRED sem o campo file', async () => {
    const res = await request(app).post('/api/resume-extractions').field('outro', 'x');
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual({ code: 'FILE_REQUIRED', message: 'Selecione um arquivo PDF para enviar.' });
  });

  it('400 FILE_REQUIRED com o arquivo em outro campo', async () => {
    const res = await request(app)
      .post('/api/resume-extractions')
      .attach('documento', Buffer.from('%PDF-1.4'), 'a.pdf');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });

  it('413 FILE_TOO_LARGE com 5.242.881 bytes', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(MAX_BYTES + 1 - 9, 0x20)]);
    expect(big.length).toBe(MAX_BYTES + 1);
    const res = await upload(big);
    expect(res.status).toBe(413);
    expect(res.body.error).toEqual({
      code: 'FILE_TOO_LARGE',
      message: 'O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.',
    });
  });

  it('exatamente 5.242.880 bytes passa pelo limite (não é 413)', async () => {
    const limit = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(MAX_BYTES - 9, 0x20)]);
    expect(limit.length).toBe(MAX_BYTES);
    const res = await upload(limit);
    expect(res.status).not.toBe(413);
  });

  it('415 INVALID_FILE_TYPE para o sample 08 (ZIP renomeado)', async () => {
    const res = await upload(await readFile(`${SAMPLES_DIR}08-nao-e-pdf.pdf`));
    expect(res.status).toBe(415);
    expect(res.body.error).toEqual({
      code: 'INVALID_FILE_TYPE',
      message: 'Formato não aceito. Envie o currículo em PDF.',
    });
  });

  it.each([
    ['05-digitalizado-sem-texto.pdf', 'no_text'],
    ['06-protegido-por-senha.pdf', 'encrypted'],
    ['07-corrompido.pdf', 'corrupted'],
  ])('422 PDF_UNREADABLE para %s (motivo %s)', async (file, reason) => {
    const res = await upload(await readFile(`${SAMPLES_DIR}${file}`));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PDF_UNREADABLE');
    expect(res.body.error.reason).toBe(reason);
  });
});
