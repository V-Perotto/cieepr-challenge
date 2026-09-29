import { FormControl, type ValidatorFn } from '@angular/forms';
import {
  CANDIDATE_VALIDATORS,
  firstErrorCode,
  normalizePhone,
} from './candidate-validators';
import type { CandidateField } from '../../../core/models/candidate.models';

/** Primeiro código de erro do campo, ou null quando válido. */
function codeFor(field: CandidateField, value: string): string | null {
  const control = new FormControl(value, { nonNullable: true, validators: CANDIDATE_VALIDATORS[field] as ValidatorFn[] });
  return firstErrorCode(control.errors);
}

// Mesmos casos do backend (tests/unit/domain/candidate-input.schema.spec.ts): data-model.md §2.
describe('validadores do cadastro: casos compartilhados (data-model §2)', () => {
  it('nome só com espaços → REQUIRED', () => {
    expect(codeFor('fullName', '   ')).toBe('REQUIRED');
  });

  it('nome com 250 caracteres é válido; com 251 → MAX_LENGTH', () => {
    expect(codeFor('fullName', 'a'.repeat(250))).toBeNull();
    expect(codeFor('fullName', 'a'.repeat(251))).toBe('MAX_LENGTH');
  });

  it.each(['maria@', 'maria.com', '@x.com'])('e-mail malformado %s → INVALID_EMAIL', (email) => {
    expect(codeFor('email', email)).toBe('INVALID_EMAIL');
  });

  it('e-mail com espaços nas bordas é válido', () => {
    expect(codeFor('email', '  maria@x.com ')).toBeNull();
  });

  it('telefone celular e fixo formatados são válidos e normalizados', () => {
    expect(codeFor('phone', '(41) 99999-9999')).toBeNull();
    expect(normalizePhone('(41) 99999-9999')).toBe('41999999999');
    expect(codeFor('phone', '(41) 3333-4444')).toBeNull();
    expect(normalizePhone('(41) 3333-4444')).toBe('4133334444');
  });

  it.each(['99999-9999', '+55 41 99999-9999', '41abc999999'])('telefone %s → INVALID_PHONE', (phone) => {
    expect(codeFor('phone', phone)).toBe('INVALID_PHONE');
  });

  it('telefone vazio é válido (opcional)', () => {
    expect(codeFor('phone', '')).toBeNull();
  });

  it('resumo com 1000 caracteres é válido; com 1001 → MAX_LENGTH', () => {
    expect(codeFor('professionalSummary', 'x'.repeat(1000))).toBeNull();
    expect(codeFor('professionalSummary', 'x'.repeat(1001))).toBe('MAX_LENGTH');
  });

  it('aceita acentos, cedilha e quebras de linha', () => {
    expect(codeFor('fullName', 'Conceição')).toBeNull();
    expect(codeFor('professionalSummary', 'Linha 1\nLinha 2')).toBeNull();
  });
});

describe('validadores do cadastro: demais regras', () => {
  it('e-mail vazio → REQUIRED (e não INVALID_EMAIL)', () => {
    expect(codeFor('email', '')).toBe('REQUIRED');
  });

  it('e-mail com 251 caracteres → MAX_LENGTH', () => {
    expect(codeFor('email', `${'a'.repeat(239)}@example.com`)).toBe('MAX_LENGTH');
  });

  it('área de interesse com 251 caracteres → MAX_LENGTH', () => {
    expect(codeFor('areaOfInterest', 'a'.repeat(251))).toBe('MAX_LENGTH');
  });

  it('firstErrorCode prioriza o erro vindo do servidor', () => {
    expect(firstErrorCode({ server: 'x', REQUIRED: true })).toBe('server');
    expect(firstErrorCode(null)).toBeNull();
  });
});
