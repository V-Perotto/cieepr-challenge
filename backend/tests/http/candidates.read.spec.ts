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

  async function seed(count: number) {
    for (let i = 1; i <= count; i++) {
      await repository.create({
        fullName: `Candidato ${i}`,
        email: `c${i}@example.com`,
        phone: '41999999999',
        areaOfInterest: i === 1 ? 'RH' : null,
        professionalSummary: 'Resumo',
      });
    }
  }

  it('200 com página vazia quando não há candidatos', async () => {
    const res = await request(app).get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 10, total: 0 });
  });

  it('por padrão devolve a página 1 com 10 resumos, do mais recente ao mais antigo, e o total', async () => {
    await seed(12);

    const res = await request(app).get('/api/candidates');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(12);
    expect(res.body.items).toHaveLength(10);
    expect(res.body.items[0].fullName).toBe('Candidato 12');
    expect(Object.keys(res.body.items[0]).sort()).toEqual(['areaOfInterest', 'createdAt', 'email', 'fullName', 'id']);
  });

  it('a página 2 traz os restantes', async () => {
    await seed(12);
    const res = await request(app).get('/api/candidates?page=2');
    expect(res.body.items.map((c: { fullName: string }) => c.fullName)).toEqual(['Candidato 2', 'Candidato 1']);
    expect(res.body.items[1].areaOfInterest).toBe('RH');
  });

  it('aceita pageSize e devolve items vazio além da última página', async () => {
    await seed(12);
    expect((await request(app).get('/api/candidates?page=2&pageSize=5')).body.items).toHaveLength(5);
    expect((await request(app).get('/api/candidates?page=99')).body).toEqual({
      items: [],
      page: 99,
      pageSize: 10,
      total: 12,
    });
  });

  it.each(['page=0', 'page=abc', 'pageSize=51', 'pageSize=0'])('400 para %s', async (query) => {
    const res = await request(app).get(`/api/candidates?${query}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Parâmetros de paginação inválidos.' },
    });
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
