import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { CandidateService } from '../../src/services/candidate.service.js';
import { FakeCandidateRepository } from '../fakes/fake-candidate.repository.js';
import { createTestApp } from './test-app.js';

describe('POST /api/candidates', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp({ candidateService: new CandidateService(new FakeCandidateRepository()) });
  });

  it('201 com Location e o candidato no formato do contrato', async () => {
    const res = await request(app)
      .post('/api/candidates')
      .send({ fullName: 'Maria Souza', email: 'maria@example.com', phone: '(41) 99999-9999' });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/candidates/${res.body.id}`);
    expect(res.body).toEqual({
      id: expect.any(Number),
      fullName: 'Maria Souza',
      email: 'maria@example.com',
      phone: '41999999999',
      areaOfInterest: null,
      professionalSummary: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
  });

  it('400 VALIDATION_ERROR com erros por campo', async () => {
    const res = await request(app).post('/api/candidates').send({ fullName: '   ', email: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Alguns campos precisam de correção.');
    expect(res.body.error.fields).toEqual([
      { field: 'fullName', code: 'REQUIRED', message: 'Informe o nome completo.' },
      { field: 'email', code: 'INVALID_EMAIL', message: 'Informe um e-mail válido, como nome@empresa.com.' },
    ]);
  });

  it('409 EMAIL_ALREADY_EXISTS com o erro no campo email', async () => {
    await request(app).post('/api/candidates').send({ fullName: 'Maria', email: 'maria@email.com' });
    const res = await request(app).post('/api/candidates').send({ fullName: 'Maria 2', email: 'MARIA@email.com' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(res.body.error.fields[0]).toEqual({
      field: 'email',
      code: 'EMAIL_ALREADY_EXISTS',
      message: 'Já existe um candidato com este e-mail.',
    });
  });

  it('400 para JSON malformado', async () => {
    const res = await request(app)
      .post('/api/candidates')
      .set('Content-Type', 'application/json')
      .send('{"fullName": "Maria",');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400 para propriedade fora do contrato', async () => {
    const res = await request(app)
      .post('/api/candidates')
      .send({ fullName: 'Maria', email: 'maria@example.com', isAdmin: true });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
