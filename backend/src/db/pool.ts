import sql from 'mssql';
import type { AppConfig } from '../config/env.js';
import { DatabaseUnavailableError } from '../domain/errors.js';
import type { Logger } from '../logger.js';

export type Pool = sql.ConnectionPool;

/** Cria o pool (sem conectar). `database` permite abrir uma conexão no `master`. */
export function createPool(db: AppConfig['db'], database: string = db.name): Pool {
  return new sql.ConnectionPool({
    server: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database,
    options: {
      encrypt: true,
      // O SQL Server do Docker usa certificado autoassinado (ambiente de desenvolvimento).
      trustServerCertificate: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  });
}

export interface RetryOptions {
  attempts: number;
  delayMs: number;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Conecta com novas tentativas: o SQL Server pode levar alguns segundos para aceitar logins. */
export async function connectWithRetry(
  factory: () => Pool,
  { attempts, delayMs }: RetryOptions,
  logger: Logger,
): Promise<Pool> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const pool = factory();
    try {
      await pool.connect();
      logger.info({ attempt }, 'conectado ao SQL Server');
      return pool;
    } catch (err) {
      await pool.close().catch(() => undefined);
      logger.warn(
        { attempt, attempts, err: (err as Error).message },
        'falha ao conectar ao SQL Server; tentando novamente',
      );
      if (attempt < attempts) await wait(delayMs);
    }
  }
  throw new DatabaseUnavailableError();
}
