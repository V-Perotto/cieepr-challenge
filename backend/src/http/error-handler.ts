import type { ErrorRequestHandler } from 'express';
import { AppError, ERROR_MESSAGES } from '../domain/errors.js';
import type { Logger } from '../logger.js';

/** Converte qualquer erro no formato ErrorResponse do contrato (contracts/openapi.yaml). */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.httpStatus).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
          ...(err.reason ? { reason: err.reason } : {}),
        },
      });
      return;
    }

    if (isBodyParserError(err)) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: ERROR_MESSAGES.VALIDATION_ERROR },
      });
      return;
    }

    logger.error({ err }, 'erro inesperado');
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR },
    });
  };
}

function isBodyParserError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('type' in err)) return false;
  return err.type === 'entity.parse.failed' || err.type === 'entity.too.large';
}
