import type { Candidate, CandidateSummary, NewCandidate } from '../domain/candidate.js';

/** Único ponto de acesso aos dados de candidatos (constituição, Princípio V). */
export interface CandidateRepository {
  /** @throws EmailAlreadyExistsError quando o e-mail já existe (sem diferenciar maiúsculas). */
  create(candidate: NewCandidate): Promise<Candidate>;
  /** Uma fatia da listagem, do mais recente para o mais antigo, e o total de candidatos. */
  list(slice: { offset: number; limit: number }): Promise<{ items: CandidateSummary[]; total: number }>;
  findById(id: number): Promise<Candidate | null>;
}
