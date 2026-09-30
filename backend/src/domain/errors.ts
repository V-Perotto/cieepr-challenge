import type { CandidateField } from './candidate.js';

/** Códigos de erro do contrato (contracts/openapi.yaml → ErrorResponse). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'CANDIDATE_NOT_FOUND'
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'PDF_UNREADABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export type FieldErrorCode =
  | 'REQUIRED'
  | 'MAX_LENGTH'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'EMAIL_ALREADY_EXISTS';

export interface FieldError {
  field: CandidateField;
  code: FieldErrorCode;
  message: string;
}

export type PdfUnreadableReason = 'encrypted' | 'corrupted' | 'no_text' | 'timeout';

/** Mensagens pt-BR exibidas ao usuário (contracts/ui-contract.md). */
export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Alguns campos precisam de correção.',
  EMAIL_ALREADY_EXISTS: 'Já existe um candidato com este e-mail.',
  CANDIDATE_NOT_FOUND: 'Candidato não encontrado. Ele pode não existir ou o link está incorreto.',
  FILE_REQUIRED: 'Selecione um arquivo PDF para enviar.',
  FILE_TOO_LARGE: 'O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.',
  INVALID_FILE_TYPE: 'Formato não aceito. Envie o currículo em PDF.',
  DATABASE_UNAVAILABLE: 'O banco de dados está indisponível no momento. Tente novamente em instantes.',
  INTERNAL_ERROR: 'Não foi possível concluir a operação agora. Tente novamente em instantes.',
} as const satisfies Record<Exclude<ErrorCode, 'PDF_UNREADABLE'>, string>;

export const INVALID_PAGINATION_MESSAGE = 'Parâmetros de paginação inválidos.';

export const PDF_UNREADABLE_MESSAGES = {
  encrypted:
    'Não foi possível ler o PDF porque ele está protegido por senha. Preencha os dados manualmente.',
  corrupted:
    'Não foi possível ler o PDF. O arquivo pode estar corrompido. Preencha os dados manualmente.',
  no_text:
    'Não encontramos texto no PDF. Ele pode ser uma imagem digitalizada. Preencha os dados manualmente.',
  timeout:
    'A leitura do PDF demorou mais que o esperado. Preencha os dados manualmente ou tente outro arquivo.',
} as const satisfies Record<PdfUnreadableReason, string>;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly httpStatus: number,
    message: string,
    readonly fields?: FieldError[],
    readonly reason?: PdfUnreadableReason,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(fields: FieldError[]) {
    super('VALIDATION_ERROR', 400, ERROR_MESSAGES.VALIDATION_ERROR, fields);
  }
}

/** `page`/`pageSize` fora do formato ou dos limites da listagem (400, sem erros por campo). */
export class InvalidPaginationError extends AppError {
  constructor() {
    super('VALIDATION_ERROR', 400, INVALID_PAGINATION_MESSAGE);
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor() {
    super('EMAIL_ALREADY_EXISTS', 409, ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, [
      { field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: ERROR_MESSAGES.EMAIL_ALREADY_EXISTS },
    ]);
  }
}

export class CandidateNotFoundError extends AppError {
  constructor() {
    super('CANDIDATE_NOT_FOUND', 404, ERROR_MESSAGES.CANDIDATE_NOT_FOUND);
  }
}

export class FileRequiredError extends AppError {
  constructor() {
    super('FILE_REQUIRED', 400, ERROR_MESSAGES.FILE_REQUIRED);
  }
}

export class FileTooLargeError extends AppError {
  constructor() {
    super('FILE_TOO_LARGE', 413, ERROR_MESSAGES.FILE_TOO_LARGE);
  }
}

export class InvalidFileTypeError extends AppError {
  constructor() {
    super('INVALID_FILE_TYPE', 415, ERROR_MESSAGES.INVALID_FILE_TYPE);
  }
}

export class PdfUnreadableError extends AppError {
  constructor(reason: PdfUnreadableReason) {
    super('PDF_UNREADABLE', 422, PDF_UNREADABLE_MESSAGES[reason], undefined, reason);
  }
}

export class DatabaseUnavailableError extends AppError {
  constructor() {
    super('DATABASE_UNAVAILABLE', 503, ERROR_MESSAGES.DATABASE_UNAVAILABLE);
  }
}
