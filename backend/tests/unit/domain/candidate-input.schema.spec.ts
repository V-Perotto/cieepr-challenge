import { describe, expect, it } from 'vitest';
import { normalizePhone, parseCandidateInput } from '../../../src/domain/candidate-input.schema.js';

const valid = { fullName: 'Maria Souza', email: 'maria@example.com' };

/** Códigos de erro por campo, para asserções compactas. */
function errorCodes(raw: unknown): Record<string, string> {
  const result = parseCandidateInput(raw);
  if (result.ok) return {};
  return Object.fromEntries(result.fields.map((f) => [f.field, f.code]));
}

function value(raw: unknown) {
  const result = parseCandidateInput(raw);
  if (!result.ok) throw new Error(`esperava válido, recebeu ${JSON.stringify(result.fields)}`);
  return result.value;
}

// Casos compartilhados com o frontend: data-model.md §2.
describe('parseCandidateInput: casos compartilhados (data-model §2)', () => {
  it('nome só com espaços → REQUIRED', () => {
    expect(errorCodes({ ...valid, fullName: '   ' })).toEqual({ fullName: 'REQUIRED' });
  });

  it('nome com 250 caracteres é válido; com 251 → MAX_LENGTH', () => {
    expect(value({ ...valid, fullName: 'a'.repeat(250) }).fullName).toHaveLength(250);
    expect(errorCodes({ ...valid, fullName: 'a'.repeat(251) })).toEqual({ fullName: 'MAX_LENGTH' });
  });

  it.each(['maria@', 'maria.com', '@x.com'])('e-mail malformado %s → INVALID_EMAIL', (email) => {
    expect(errorCodes({ ...valid, email })).toEqual({ email: 'INVALID_EMAIL' });
  });

  it('e-mail com espaços nas bordas é válido e gravado sem eles', () => {
    expect(value({ ...valid, email: '  maria@x.com ' }).email).toBe('maria@x.com');
  });

  it('telefone celular formatado é gravado só com dígitos', () => {
    expect(value({ ...valid, phone: '(41) 99999-9999' }).phone).toBe('41999999999');
  });

  it('telefone fixo formatado é gravado só com dígitos', () => {
    expect(value({ ...valid, phone: '(41) 3333-4444' }).phone).toBe('4133334444');
  });

  it.each(['99999-9999', '+55 41 99999-9999', '41abc999999'])('telefone %s → INVALID_PHONE', (phone) => {
    expect(errorCodes({ ...valid, phone })).toEqual({ phone: 'INVALID_PHONE' });
  });

  it('telefone vazio vira null', () => {
    expect(value({ ...valid, phone: '' }).phone).toBeNull();
  });

  it('resumo com 1000 caracteres é válido; com 1001 → MAX_LENGTH', () => {
    expect(value({ ...valid, professionalSummary: 'x'.repeat(1000) }).professionalSummary).toHaveLength(1000);
    expect(errorCodes({ ...valid, professionalSummary: 'x'.repeat(1001) })).toEqual({
      professionalSummary: 'MAX_LENGTH',
    });
  });

  it('preserva acentos, cedilha e quebras de linha', () => {
    const result = value({ ...valid, fullName: 'Conceição', professionalSummary: 'Linha 1\nLinha 2' });
    expect(result.fullName).toBe('Conceição');
    expect(result.professionalSummary).toBe('Linha 1\nLinha 2');
  });
});

describe('parseCandidateInput: demais regras', () => {
  it('aceita só os obrigatórios e converte os opcionais ausentes em null', () => {
    expect(value(valid)).toEqual({
      fullName: 'Maria Souza',
      email: 'maria@example.com',
      phone: null,
      areaOfInterest: null,
      professionalSummary: null,
    });
  });

  it('aceita null explícito nos opcionais', () => {
    expect(value({ ...valid, phone: null, areaOfInterest: null, professionalSummary: null }).phone).toBeNull();
  });

  it('opcional só com espaços vira null', () => {
    expect(value({ ...valid, areaOfInterest: '   ' }).areaOfInterest).toBeNull();
  });

  it('nome e e-mail ausentes → REQUIRED', () => {
    expect(errorCodes({})).toEqual({ fullName: 'REQUIRED', email: 'REQUIRED' });
  });

  it('e-mail com 251 caracteres → MAX_LENGTH', () => {
    const email = `${'a'.repeat(239)}@example.com`;
    expect(email).toHaveLength(251);
    expect(errorCodes({ ...valid, email })).toEqual({ email: 'MAX_LENGTH' });
  });

  it('área de interesse com 251 caracteres → MAX_LENGTH', () => {
    expect(errorCodes({ ...valid, areaOfInterest: 'a'.repeat(251) })).toEqual({ areaOfInterest: 'MAX_LENGTH' });
  });

  it('tipo errado em um campo → erro no campo, sem exceção', () => {
    expect(errorCodes({ ...valid, fullName: 42 })).toEqual({ fullName: 'REQUIRED' });
  });

  it('propriedade desconhecida invalida a entrada', () => {
    expect(parseCandidateInput({ ...valid, isAdmin: true }).ok).toBe(false);
  });

  it('entrada que não é objeto é inválida', () => {
    expect(parseCandidateInput(null).ok).toBe(false);
    expect(parseCandidateInput('texto').ok).toBe(false);
  });

  it('mensagens de erro em pt-BR, conforme o ui-contract', () => {
    const result = parseCandidateInput({ fullName: '', email: 'x', phone: '1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const messages = Object.fromEntries(result.fields.map((f) => [f.field, f.message]));
    expect(messages).toEqual({
      fullName: 'Informe o nome completo.',
      email: 'Informe um e-mail válido, como nome@empresa.com.',
      phone: 'Informe o telefone com DDD, com 10 ou 11 dígitos, sem o código do país. Ex.: (41) 99999-9999.',
    });
  });
});

describe('normalizePhone', () => {
  it('remove parênteses, espaços e hífen', () => {
    expect(normalizePhone(' (41) 3333-4444 ')).toBe('4133334444');
  });
});
