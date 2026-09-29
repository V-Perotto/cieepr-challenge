import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { createCandidatesRouter } from './controllers/candidates.controller.js';
import { createHealthRouter } from './controllers/health.controller.js';
import { createResumeExtractionsRouter } from './controllers/resume-extractions.controller.js';
import { createErrorHandler } from './http/error-handler.js';
import type { Logger } from './logger.js';
import type { CandidateService } from './services/candidate.service.js';
import type { ResumeExtractionService } from './services/resume-extraction.service.js';

/** Dependências injetadas manualmente (Controller → Service → Repository). */
export interface AppDependencies {
  logger: Logger;
  checkDatabase: () => Promise<boolean>;
  candidateService: CandidateService;
  resumeExtractionService: ResumeExtractionService;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger: deps.logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', createHealthRouter(deps.checkDatabase));
  app.use('/api/candidates', createCandidatesRouter(deps.candidateService));
  app.use('/api/resume-extractions', createResumeExtractionsRouter(deps.resumeExtractionService));

  app.use(createErrorHandler(deps.logger));
  return app;
}
