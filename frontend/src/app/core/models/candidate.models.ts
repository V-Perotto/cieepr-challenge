/** Tipos espelhados do contrato HTTP (specs/001-candidate-registration/contracts/openapi.yaml). */

export type CandidateField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'areaOfInterest'
  | 'professionalSummary';

export type ResumeField = 'fullName' | 'email' | 'phone';

export interface CandidateInput {
  fullName: string;
  email: string;
  phone: string | null;
  areaOfInterest: string | null;
  professionalSummary: string | null;
}

export interface CandidateSummary {
  id: number;
  fullName: string;
  email: string;
  areaOfInterest: string | null;
  /** UTC em ISO-8601. */
  createdAt: string;
}

export interface Candidate extends CandidateSummary {
  /** Só dígitos (10 ou 11). */
  phone: string | null;
  professionalSummary: string | null;
}

export interface ResumeExtractionResult {
  fields: Record<ResumeField, string | null>;
  identified: ResumeField[];
  notIdentified: ResumeField[];
  pagesRead: number;
}

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

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'CANDIDATE_NOT_FOUND'
  | 'FILE_REQUIRED'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'PDF_UNREADABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    reason?: PdfUnreadableReason;
    fields?: FieldError[];
  };
}
