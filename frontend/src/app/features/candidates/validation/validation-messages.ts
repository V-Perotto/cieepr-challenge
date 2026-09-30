import type { CandidateField, FieldErrorCode } from '../../../core/models/candidate.models';

/** Textos literais de contracts/ui-contract.md → "Mensagens de validação". */
export const VALIDATION_MESSAGES: Record<CandidateField, Partial<Record<FieldErrorCode, string>>> = {
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

export function validationMessage(field: CandidateField, code: FieldErrorCode): string {
  return VALIDATION_MESSAGES[field][code] ?? 'Verifique este campo.';
}
