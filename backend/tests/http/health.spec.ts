import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createErrorHandler } from '../../src/http/error-handler.js';
import { HealthService } from '../../src/services/health.service.js';
import { createTestApp } from './test-app.js';

const logger = pino({ level: 'silent' });

describe('GET /api/health', () => {
  it('responde 200 quando o banco está disponível', async () => {
    const app = createTestApp({ healthService: new HealthService({ ping: async () => true }) });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 503 DATABASE_UNAVAILABLE quando o banco não responde', async () => {
    const app = createTestApp({ healthService: new HealthService({ ping: async () => false }) });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('trata uma exceção da checagem como banco indisponível', async () => {
    const app = createTestApp({
      healthService: new HealthService({
        ping: async () => {
          throw new Error('ECONNREFUSED');
        },
      }),
    });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
  });
});

describe('error handler', () => {
  it('converte um erro inesperado em 500 INTERNAL_ERROR sem stack trace', async () => {
    const app = express();
    app.get('/boom', () => {
      throw new Error('detalhe interno sensível');
    });
    app.use(createErrorHandler(logger));

    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Não foi possível concluir a operação agora. Tente novamente em instantes.',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('sensível');
  });
});
