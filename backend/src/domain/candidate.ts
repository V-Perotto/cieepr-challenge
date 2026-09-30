export type CandidateField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'areaOfInterest'
  | 'professionalSummary';

export type ResumeField = 'fullName' | 'email' | 'phone';

/** Candidato já validado e normalizado, pronto para gravar (data-model §1). */
export interface NewCandidate {
  fullName: string;
  email: string;
  /** Só dígitos: 10 ou 11 (DDD + número). */
  phone: string | null;
  areaOfInterest: string | null;
  professionalSummary: string | null;
}

export interface Candidate extends NewCandidate {
  id: number;
  createdAt: Date;
}

export interface CandidateSummary {
  id: number;
  fullName: string;
  email: string;
  areaOfInterest: string | null;
  createdAt: Date;
}

export interface CandidateSummaryDto {
  id: number;
  fullName: string;
  email: string;
  areaOfInterest: string | null;
  createdAt: string;
}

export interface CandidateDto extends CandidateSummaryDto {
  phone: string | null;
  professionalSummary: string | null;
}

/** Página da listagem (FR-025). */
export interface CandidatePage {
  items: CandidateSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CandidatePageDto extends Omit<CandidatePage, 'items'> {
  items: CandidateSummaryDto[];
}

export interface ResumeExtractionResult {
  fields: Record<ResumeField, string | null>;
  identified: ResumeField[];
  notIdentified: ResumeField[];
  pagesRead: number;
}

export function toCandidateSummaryDto(c: CandidateSummary): CandidateSummaryDto {
  return {
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    areaOfInterest: c.areaOfInterest,
    createdAt: c.createdAt.toISOString(),
  };
}

export function toCandidatePageDto(page: CandidatePage): CandidatePageDto {
  return { ...page, items: page.items.map(toCandidateSummaryDto) };
}

export function toCandidateDto(c: Candidate): CandidateDto {
  return {
    ...toCandidateSummaryDto(c),
    phone: c.phone,
    professionalSummary: c.professionalSummary,
  };
}
