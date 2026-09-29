import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { CandidateField, FieldErrorCode } from '../../../core/models/candidate.models';

/**
 * Regras do cadastro (data-model.md §2). Espelham backend/src/domain/candidate-input.schema.ts
 * e são testadas com os mesmos casos.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
const PHONE_ALLOWED_CHARS = /^[0-9()\s-]+$/;

export const MAX_LENGTH = {
  fullName: 250,
  email: 250,
  areaOfInterest: 250,
  professionalSummary: 1000,
} as const;

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

const text = (control: AbstractControl): string =>
  typeof control.value === 'string' ? control.value.trim() : '';

export const requiredTrimmed: ValidatorFn = (control) =>
  text(control).length === 0 ? { REQUIRED: true } : null;

export function maxLengthTrimmed(max: number): ValidatorFn {
  return (control) => (text(control).length > max ? { MAX_LENGTH: { max } } : null);
}

export const emailFormat: ValidatorFn = (control) => {
  const value = text(control);
  return value.length > 0 && !EMAIL_PATTERN.test(value) ? { INVALID_EMAIL: true } : null;
};

export const phoneBr: ValidatorFn = (control) => {
  const value = text(control);
  if (value.length === 0) return null;
  const digits = normalizePhone(value);
  const valid = PHONE_ALLOWED_CHARS.test(value) && (digits.length === 10 || digits.length === 11);
  return valid ? null : { INVALID_PHONE: true };
};

export const CANDIDATE_VALIDATORS: Record<CandidateField, ValidatorFn[]> = {
  fullName: [requiredTrimmed, maxLengthTrimmed(MAX_LENGTH.fullName)],
  email: [requiredTrimmed, maxLengthTrimmed(MAX_LENGTH.email), emailFormat],
  phone: [phoneBr],
  areaOfInterest: [maxLengthTrimmed(MAX_LENGTH.areaOfInterest)],
  professionalSummary: [maxLengthTrimmed(MAX_LENGTH.professionalSummary)],
};

const PRIORITY: readonly (FieldErrorCode | 'server')[] = [
  'server',
  'REQUIRED',
  'MAX_LENGTH',
  'INVALID_EMAIL',
  'INVALID_PHONE',
];

/** Código do erro a exibir: o do servidor tem prioridade, depois a ordem das regras. */
export function firstErrorCode(errors: ValidationErrors | null): FieldErrorCode | 'server' | null {
  if (!errors) return null;
  return PRIORITY.find((code) => code in errors) ?? null;
}
