import { z } from 'zod';
import type { CandidateField, NewCandidate } from './candidate.js';
import type { FieldError, FieldErrorCode } from './errors.js';

/**
 * Regras de validação do cadastro (data-model.md §2). O frontend implementa as mesmas regras
 * em candidate-validators.ts e as duas implementações são testadas com os mesmos casos.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;
export const PHONE_ALLOWED_CHARS = /^[0-9()\s-]+$/;
export const MAX_LENGTH = {
  fullName: 250,
  email: 250,
  areaOfInterest: 250,
  professionalSummary: 1000,
} as const;

/** Mensagens pt-BR por campo e código (contracts/ui-contract.md → Mensagens de validação). */
export const VALIDATION_MESSAGES: Partial<Record<CandidateField, Partial<Record<FieldErrorCode, string>>>> = {
  fullName: {
    REQUIRED: 'Informe o nome completo.',
    MAX_LENGTH: 'O nome pode ter no máximo 250 caracteres.',
  },
  email: {
    REQUIRED: 'Informe o e-mail.',
    MAX_LENGTH: 'O e-mail pode ter no máximo 250 caracteres.',
    INVALID_EMAIL: 'Informe um e-mail válido, como nome@empresa.com.',
    EMAIL_ALREADY_EXISTS: 'Já existe um candidato com este e-mail.',
  },
  phone: {
    INVALID_PHONE:
      'Informe o telefone com DDD, com 10 ou 11 dígitos, sem o código do país. Ex.: (41) 99999-9999.',
  },
  areaOfInterest: {
    MAX_LENGTH: 'A área ou cargo pode ter no máximo 250 caracteres.',
  },
  professionalSummary: {
    MAX_LENGTH: 'O resumo pode ter no máximo 1000 caracteres.',
  },
};

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** Telefone válido: só dígitos, ( ), espaço e -; depois de normalizar, 10 ou 11 dígitos. */
export function isValidPhone(value: string): boolean {
  if (!PHONE_ALLOWED_CHARS.test(value)) return false;
  const digits = normalizePhone(value);
  return digits.length === 10 || digits.length === 11;
}

const requiredText = (max: number) =>
  z.string({ error: 'REQUIRED' }).trim().min(1, 'REQUIRED').max(max, 'MAX_LENGTH');

// Tipo errado num opcional (uso indevido da API) recebe o código da regra do próprio campo.
const optionalText = (max: number) =>
  z
    .string({ error: 'MAX_LENGTH' })
    .trim()
    .max(max, 'MAX_LENGTH')
    .nullish()
    .transform((v) => (v ? v : null));

const candidateInputSchema = z.strictObject({
  fullName: requiredText(MAX_LENGTH.fullName),
  email: requiredText(MAX_LENGTH.email).regex(EMAIL_PATTERN, 'INVALID_EMAIL'),
  phone: z
    .string({ error: 'INVALID_PHONE' })
    .trim()
    .nullish()
    .transform((v, ctx) => {
      if (!v) return null;
      if (!isValidPhone(v)) {
        ctx.addIssue({ code: 'custom', message: 'INVALID_PHONE' });
        return z.NEVER;
      }
      return normalizePhone(v);
    }),
  areaOfInterest: optionalText(MAX_LENGTH.areaOfInterest),
  professionalSummary: optionalText(MAX_LENGTH.professionalSummary),
});

export type ParseResult = { ok: true; value: NewCandidate } | { ok: false; fields: FieldError[] };

const FIELDS: readonly CandidateField[] = ['fullName', 'email', 'phone', 'areaOfInterest', 'professionalSummary'];

function isCandidateField(value: unknown): value is CandidateField {
  return FIELDS.includes(value as CandidateField);
}

/** Valida e normaliza a entrada; devolve no máximo um erro por campo (o primeiro). */
export function parseCandidateInput(raw: unknown): ParseResult {
  const parsed = candidateInputSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };

  const fields: FieldError[] = [];
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if (!isCandidateField(field) || fields.some((f) => f.field === field)) continue;
    const code = issue.message as FieldErrorCode;
    fields.push({ field, code, message: VALIDATION_MESSAGES[field]?.[code] ?? issue.message });
  }
  fields.sort((a, b) => FIELDS.indexOf(a.field) - FIELDS.indexOf(b.field));
  return { ok: false, fields };
}
