import type { HttpErrorResponse } from '@angular/common/http';
import type {
  ApiErrorBody,
  ApiErrorCode,
  FieldError,
  PdfUnreadableReason,
} from '../models/candidate.models';

export interface ApiError {
  status: number;
  code: ApiErrorCode;
  /** Mensagem pt-BR do backend, quando houver corpo JSON. */
  message?: string;
  fields: FieldError[];
  reason?: PdfUnreadableReason;
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== 'object' || body === null || !('error' in body)) return false;
  const error = (body as { error: unknown }).error;
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string';
}

/** Normaliza qualquer falha HTTP no formato de erro do contrato. */
export function toApiError(err: HttpErrorResponse): ApiError {
  if (isApiErrorBody(err.error)) {
    const { code, message, fields, reason } = err.error.error;
    return {
      status: err.status,
      code,
      message,
      fields: fields ?? [],
      ...(reason ? { reason } : {}),
    };
  }
  // 413 do Nginx vem em HTML (arquivo acima de 6 MB): tratado como arquivo grande demais.
  if (err.status === 413) return { status: 413, code: 'FILE_TOO_LARGE', fields: [] };
  if (err.status === 0) return { status: 0, code: 'NETWORK_ERROR', fields: [] };
  return { status: err.status, code: 'INTERNAL_ERROR', fields: [] };
}
