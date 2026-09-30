import { pino, type Logger } from 'pino';
import type { LogLevel } from './config/env.js';

export type { Logger };

/** Logger JSON no stdout. Nunca registra corpo de requisição nem dados de currículos. */
export function createLogger(level: LogLevel): Logger {
  return pino({
    level,
    base: { service: 'cieepr-backend' },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body'],
      remove: true,
    },
  });
}
