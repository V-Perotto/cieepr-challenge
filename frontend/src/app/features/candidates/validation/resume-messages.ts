import type { ApiError } from '../../../core/api/api-error';
import type { PdfUnreadableReason, ResumeField } from '../../../core/models/candidate.models';

/** Textos literais de contracts/ui-contract.md → "Mensagens do currículo em PDF". */
export const RESUME_MESSAGES = {
  processing: 'Lendo o currículo... Você pode continuar preenchendo o formulário.',
  allIdentified: 'Dados do currículo preenchidos. Confira as informações antes de salvar.',
  noneIdentified: 'Não encontramos nome, e-mail nem telefone no currículo. Preencha os dados manualmente.',
  invalidType: 'Formato não aceito. Envie o currículo em PDF.',
  tooLarge: 'O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.',
  genericFailure: 'Não foi possível ler o PDF agora. Preencha os dados manualmente.',
} as const;

export const PDF_UNREADABLE_MESSAGES: Record<PdfUnreadableReason, string> = {
  encrypted:
    'Não foi possível ler o PDF porque ele está protegido por senha. Preencha os dados manualmente.',
  corrupted:
    'Não foi possível ler o PDF. O arquivo pode estar corrompido. Preencha os dados manualmente.',
  no_text:
    'Não encontramos texto no PDF. Ele pode ser uma imagem digitalizada. Preencha os dados manualmente.',
  timeout:
    'A leitura do PDF demorou mais que o esperado. Preencha os dados manualmente ou tente outro arquivo.',
};

const FIELD_NAMES: Record<ResumeField, string> = {
  fullName: 'o nome',
  email: 'o e-mail',
  phone: 'o telefone',
};

/** "o telefone" · "o nome e o telefone" · "o nome, o e-mail e o telefone". */
function joinFields(fields: readonly ResumeField[]): string {
  const names = fields.map((f) => FIELD_NAMES[f]);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
}

export function notIdentifiedMessage(fields: readonly ResumeField[]): string {
  return `Não encontramos ${joinFields(fields)} no currículo. Preencha manualmente.`;
}

export function extractionErrorMessage(error: ApiError): string {
  switch (error.code) {
    case 'INVALID_FILE_TYPE':
      return RESUME_MESSAGES.invalidType;
    case 'FILE_TOO_LARGE':
      return RESUME_MESSAGES.tooLarge;
    case 'PDF_UNREADABLE':
      return error.reason ? PDF_UNREADABLE_MESSAGES[error.reason] : RESUME_MESSAGES.genericFailure;
    default:
      return RESUME_MESSAGES.genericFailure;
  }
}
