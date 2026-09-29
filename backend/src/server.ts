import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { connectWithRetry, createPool } from './db/pool.js';
import { UnpdfTextExtractor } from './extraction/pdf-text-extractor.js';
import { createLogger } from './logger.js';
import { MssqlCandidateRepository } from './repositories/mssql-candidate.repository.js';
import { CandidateService } from './services/candidate.service.js';
import { ResumeExtractionService } from './services/resume-extraction.service.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  try {
    await runMigrations({ config, logger });
  } catch (err) {
    logger.fatal({ err }, 'falha ao aplicar as migrations; encerrando');
    process.exit(1);
  }

  const pool = await connectWithRetry(() => createPool(config.db), { attempts: 12, delayMs: 5000 }, logger);

  const app = createApp({
    logger,
    checkDatabase: async () => {
      await pool.request().query('SELECT 1');
      return true;
    },
    candidateService: new CandidateService(new MssqlCandidateRepository(pool)),
    resumeExtractionService: new ResumeExtractionService(new UnpdfTextExtractor(), logger, {
      timeoutMs: config.pdfExtractionTimeoutMs,
      maxPages: 5,
    }),
  });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API ouvindo');
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, 'encerrando');
    server.close(() => {
      void pool.close().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('falha ao iniciar a API:', err instanceof Error ? err.message : err);
  process.exit(1);
});
