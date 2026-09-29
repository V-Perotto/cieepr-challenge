import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { CandidateService } from '../../src/services/candidate.service.js';
import { FakeCandidateRepository } from '../fakes/fake-candidate.repository.js';
import { createTestApp } from './test-app.js';

const NOT_FOUND_MESSAGE = 'Candidato não encontrado. Ele pode não existir ou o link está incorreto.';

describe('GET /api/candidates', () => {
  let app: Express;
  let repository: FakeCandidateRepository;

  beforeEach(() => {
    repository = new FakeCandidateRepository();
    app = createTestApp({ candidateService: new CandidateService(repository) });
  });

  it('200 com [] quando não há candidatos', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('200 com os resumos do mais recente ao mais antigo, só com os campos de CandidateSummary', async () => {
    await repository.create({
      fullName: 'Primeira',
      email: 'a@example.com',
      phone: '41999999999',
      areaOfInterest: 'RH',
      professionalSummary: 'Resumo',
    });
    await repository.create({
      fullName: 'Segunda',
      email: 'b@example.com',
      phone: null,
      areaOfInterest: null,
      professionalSummary: null,
    });

    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body.map((c: { fullName: string }) => c.fullName)).toEqual(['Segunda', 'Primeira']);
    expect(Object.keys(res.body[1]).sort()).toEqual(['areaOfInterest', 'createdAt', 'email', 'fullName', 'id']);
    expect(res.body[1].areaOfInterest).toBe('RH');
  });
});

describe('GET /api/candidates/:id', () => {
  let app: Express;
  let repository: FakeCandidateRepository;

  beforeEach(() => {
    repository = new FakeCandidateRepository();
    app = createTestApp({ candidateService: new CandidateService(repository) });
  });

  it('200 com todos os campos e createdAt em ISO-8601', async () => {
    const created = await repository.create({
      fullName: 'Conceição',
      email: 'c@example.com',
      phone: '4133334444',
      areaOfInterest: 'Dados',
      professionalSummary: 'Linha 1\nLinha 2',
    });

    const res = await request(app).get(`/api/candidates/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: created.id,
      fullName: 'Conceição',
      email: 'c@example.com',
      phone: '4133334444',
      areaOfInterest: 'Dados',
      professionalSummary: 'Linha 1\nLinha 2',
      createdAt: created.createdAt.toISOString(),
    });
  });

  it.each(['999999', 'abc'])('404 CANDIDATE_NOT_FOUND para /api/candidates/%s', async (id) => {
    const res = await request(app).get(`/api/candidates/${id}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'CANDIDATE_NOT_FOUND', message: NOT_FOUND_MESSAGE } });
  });
});
