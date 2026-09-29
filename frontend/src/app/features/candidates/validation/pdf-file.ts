import { RESUME_MESSAGES } from './resume-messages';

/** 5 MB exatos (5.242.880 bytes), mesmo limite do backend. */
export const MAX_PDF_BYTES = 5_242_880;

/** Checagem no navegador antes do envio; devolve a mensagem do problema ou null. */
export function pdfFileProblem(file: File): string | null {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return RESUME_MESSAGES.invalidType;
  if (file.size > MAX_PDF_BYTES) return RESUME_MESSAGES.tooLarge;
  return null;
}
