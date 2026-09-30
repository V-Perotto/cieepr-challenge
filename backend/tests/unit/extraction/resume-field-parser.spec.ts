import { describe, expect, it } from 'vitest';
import { parseResumeFields } from '../../../src/extraction/resume-field-parser.js';
import { RESUME_TEXTS } from '../../fixtures/resume-texts.js';

describe('parseResumeFields (research R4)', () => {
  describe('e-mail', () => {
    it('usa o primeiro e-mail do texto', () => {
      expect(parseResumeFields(RESUME_TEXTS.twoEmails).email).toBe('maria@example.com');
    });

    it('identifica o e-mail com rótulo na mesma linha', () => {
      expect(parseResumeFields(RESUME_TEXTS.simple).email).toBe('conceicao.silva@example.com');
    });
  });

  describe('telefone', () => {
    it('(41) 99876-5432 → 41998765432, ignorando CPF e CEP', () => {
      expect(parseResumeFields(RESUME_TEXTS.simple).phone).toBe('41998765432');
    });

    it('+55 41 3333-4444 → 4133334444 (sem o código do país)', () => {
      expect(parseResumeFields(RESUME_TEXTS.twoColumnsUppercase).phone).toBe('4133334444');
    });

    it('41 91234-5678 → 41912345678', () => {
      expect(parseResumeFields(RESUME_TEXTS.labeledName).phone).toBe('41912345678');
    });

    it('ignora CPF sem máscara precedido do rótulo', () => {
      expect(parseResumeFields(RESUME_TEXTS.cpfWithoutMask).phone).toBeNull();
    });

    it('descarta 11 dígitos sem 9 no terceiro dígito', () => {
      expect(parseResumeFields(RESUME_TEXTS.mobileWithoutNine).phone).toBeNull();
    });

    it('ignora CPF formatado e CEP quando não há telefone', () => {
      expect(parseResumeFields('Maria Souza\nCPF: 123.456.789-09\nCEP 80010-000').phone).toBeNull();
    });
  });

  describe('nome', () => {
    it('usa a primeira linha válida', () => {
      expect(parseResumeFields(RESUME_TEXTS.simple).fullName).toBe('Conceição Aparecida da Silva');
    });

    it('usa o valor do rótulo "Nome completo:" e ignora o título "Currículo"', () => {
      expect(parseResumeFields(RESUME_TEXTS.labeledName).fullName).toBe('Pedro Henrique Alves');
    });

    it('ignora "CONTATO" e converte MAIÚSCULAS em título, mantendo as partículas', () => {
      expect(parseResumeFields(RESUME_TEXTS.twoColumnsUppercase).fullName).toBe('João da Silva Pereira');
    });

    it('não confunde títulos de seção com nome', () => {
      expect(parseResumeFields(RESUME_TEXTS.headingsOnly).fullName).toBeNull();
    });

    it('descarta nome com mais de 250 caracteres', () => {
      const longName = `Nome: ${Array.from({ length: 6 }, () => 'A'.repeat(45)).join(' ')}`;
      expect(parseResumeFields(longName).fullName).toBeNull();
    });
  });

  it('texto sem nenhum dado → todos os campos null', () => {
    expect(parseResumeFields(RESUME_TEXTS.empty)).toEqual({ fullName: null, email: null, phone: null });
  });
});
