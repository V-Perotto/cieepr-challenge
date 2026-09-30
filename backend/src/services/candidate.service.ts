import type { Candidate, CandidatePage } from '../domain/candidate.js';
import { parseCandidateInput } from '../domain/candidate-input.schema.js';
import { CandidateNotFoundError, InvalidPaginationError, ValidationError } from '../domain/errors.js';
import type { CandidateRepository } from '../repositories/candidate.repository.js';

const DEFAULT_PAGE = 1;
const MAX_PAGE = 1_000_000;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

/** Inteiro positivo em texto (sem zero à esquerda), dentro do limite; ausente → padrão. */
function parsePositiveInt(raw: unknown, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  if (typeof raw !== 'string' || !/^[1-9][0-9]*$/.test(raw) || Number(raw) > max) throw new InvalidPaginationError();
  return Number(raw);
}

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

  /**
   * Listagem paginada, do mais recente para o mais antigo (FR-025).
   * @param query `page` (≥ 1, padrão 1) e `pageSize` (1 a 50, padrão 10), vindos da URL.
   * @throws InvalidPaginationError quando algum parâmetro não é um inteiro dentro dos limites.
   */
  async list(query: { page?: unknown; pageSize?: unknown }): Promise<CandidatePage> {
    const page = parsePositiveInt(query.page, DEFAULT_PAGE, MAX_PAGE);
    const pageSize = parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const { items, total } = await this.repository.list({ offset: (page - 1) * pageSize, limit: pageSize });
    return { items, page, pageSize, total };
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
