import type { Express } from 'express';
import { pino } from 'pino';
import { type AppDependencies, createApp } from '../../src/app.js';
import { UnpdfTextExtractor } from '../../src/extraction/pdf-text-extractor.js';
import { CandidateService } from '../../src/services/candidate.service.js';
import { HealthService } from '../../src/services/health.service.js';
import { ResumeExtractionService } from '../../src/services/resume-extraction.service.js';
import { FakeCandidateRepository } from '../fakes/fake-candidate.repository.js';

/** Monta o app real com logger silencioso e dependências falsas (sem banco). */
export function createTestApp(overrides: Partial<AppDependencies> = {}): Express {
  const logger = pino({ level: 'silent' });
  return createApp({
    logger,
    healthService: new HealthService({ ping: async () => true }),
    candidateService: new CandidateService(new FakeCandidateRepository()),
    resumeExtractionService: new ResumeExtractionService(new UnpdfTextExtractor(), logger, {
      timeoutMs: 4000,
      maxPages: 5,
    }),
    ...overrides,
  });
}
