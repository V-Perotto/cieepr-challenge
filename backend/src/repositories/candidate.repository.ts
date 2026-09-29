import type { Candidate, CandidateSummary, NewCandidate } from '../domain/candidate.js';

/** Único ponto de acesso aos dados de candidatos (constituição, Princípio V). */
export interface CandidateRepository {
  /** @throws EmailAlreadyExistsError quando o e-mail já existe (sem diferenciar maiúsculas). */
  create(candidate: NewCandidate): Promise<Candidate>;
  /** Do mais recente para o mais antigo. */
  list(): Promise<CandidateSummary[]>;
  findById(id: number): Promise<Candidate | null>;
}
