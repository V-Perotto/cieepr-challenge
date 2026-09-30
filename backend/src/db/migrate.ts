import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
import type { AppConfig } from '../config/env.js';
import type { Logger } from '../logger.js';
import { connectWithRetry, createPool, type RetryOptions } from './pool.js';

const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations/', import.meta.url));

/** Separa um script em lotes nas linhas que contêm só `GO` (como o sqlcmd faz). */
export function splitSqlBatches(script: string): string[] {
  return script
    .split(/^[ \t]*GO[ \t]*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

export interface MigrateOptions {
  config: AppConfig;
  logger: Logger;
  migrationsDir?: string;
  retry?: RetryOptions;
}

/**
 * Cria o banco (se preciso) e aplica, em ordem, as migrations .sql ainda não registradas em
 * dbo.SchemaMigrations. Cada arquivo roda numa transação (research R6).
 */
export async function runMigrations({
  config,
  logger,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  retry = { attempts: 12, delayMs: 5000 },
}: MigrateOptions): Promise<void> {
  const master = await connectWithRetry(() => createPool(config.db, 'master'), retry, logger);
  try {
    await master
      .request()
      .input('name', sql.NVarChar(128), config.db.name)
      .query(`IF DB_ID(@name) IS NULL
                BEGIN
                  DECLARE @stmt NVARCHAR(300) = N'CREATE DATABASE ' + QUOTENAME(@name);
                  EXEC (@stmt);
                END`);
  } finally {
    await master.close();
  }

  const pool = await connectWithRetry(() => createPool(config.db), retry, logger);
  try {
    await pool.request().query(`IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
        CREATE TABLE dbo.SchemaMigrations (
          Name      NVARCHAR(255) NOT NULL CONSTRAINT PK_SchemaMigrations PRIMARY KEY,
          AppliedAt DATETIME2(3)  NOT NULL CONSTRAINT DF_SchemaMigrations_AppliedAt DEFAULT SYSUTCDATETIME()
        );`);

    const applied = new Set(
      (await pool.request().query<{ Name: string }>('SELECT Name FROM dbo.SchemaMigrations')).recordset.map(
        (row) => row.Name,
      ),
    );
    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      logger.info('nenhuma migration pendente');
      return;
    }

    for (const file of pending) {
      const batches = splitSqlBatches(await readFile(join(migrationsDir, file), 'utf8'));
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        for (const batch of batches) await new sql.Request(tx).batch(batch);
        await new sql.Request(tx)
          .input('name', sql.NVarChar(255), file)
          .query('INSERT INTO dbo.SchemaMigrations (Name) VALUES (@name)');
        await tx.commit();
        logger.info({ migration: file }, `migration aplicada: ${file}`);
      } catch (err) {
        await tx.rollback().catch(() => undefined);
        throw err;
      }
    }
  } finally {
    await pool.close();
  }
}
