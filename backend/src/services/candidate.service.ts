import type { Candidate, CandidateSummary } from '../domain/candidate.js';
import { parseCandidateInput } from '../domain/candidate-input.schema.js';
import { CandidateNotFoundError, ValidationError } from '../domain/errors.js';
import type { CandidateRepository } from '../repositories/candidate.repository.js';

/** Regras de negócio do cadastro de candidatos. Não conhece HTTP nem SQL. */
export class CandidateService {
  constructor(private readonly repository: CandidateRepository) {}

  /**
   * @throws ValidationError quando algum campo viola as regras (data-model §2).
   * @throws EmailAlreadyExistsError quando o e-mail já está cadastrado.
   */
  async create(raw: unknown): Promise<Candidate> {
    const parsed = parseCandidateInput(raw);
    if (!parsed.ok) throw new ValidationError(parsed.fields);
    return this.repository.create(parsed.value);
  }

  /** Do mais recente para o mais antigo. */
  list(): Promise<CandidateSummary[]> {
    return this.repository.list();
  }

  /**
   * @param rawId id vindo da URL; só inteiros positivos sem zero à esquerda são aceitos.
   * @throws CandidateNotFoundError para id inválido ou inexistente.
   */
  async getById(rawId: string): Promise<Candidate> {
    if (!/^[1-9][0-9]{0,9}$/.test(rawId) || Number(rawId) > 2_147_483_647) throw new CandidateNotFoundError();
    const candidate = await this.repository.findById(Number(rawId));
    if (!candidate) throw new CandidateNotFoundError();
    return candidate;
  }
}
