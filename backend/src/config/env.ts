import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65_535).default(1433),
  DB_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_]+$/, 'use apenas letras, dígitos e _')
    .default('recrutamento'),
  DB_USER: z.string().min(1).default('sa'),
  DB_PASSWORD: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  PDF_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive().default(4000),
});

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface AppConfig {
  db: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  port: number;
  logLevel: LogLevel;
  pdfExtractionTimeoutMs: number;
}

export class ConfigError extends Error {
  constructor(readonly invalidKeys: string[]) {
    super(`Variáveis de ambiente inválidas ou ausentes: ${invalidKeys.join(', ')}`);
    this.name = 'ConfigError';
  }
}

/** Lê e valida as variáveis de ambiente. Os erros citam só as chaves, nunca os valores. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const keys = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new ConfigError(keys);
  }
  const e = parsed.data;
  return {
    db: {
      host: e.DB_HOST,
      port: e.DB_PORT,
      name: e.DB_NAME,
      user: e.DB_USER,
      password: e.DB_PASSWORD,
    },
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    pdfExtractionTimeoutMs: e.PDF_EXTRACTION_TIMEOUT_MS,
  };
}
