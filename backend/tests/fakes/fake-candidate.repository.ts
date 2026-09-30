import type { Candidate, CandidateSummary, NewCandidate } from '../../src/domain/candidate.js';
import { EmailAlreadyExistsError } from '../../src/domain/errors.js';
import type { CandidateRepository } from '../../src/repositories/candidate.repository.js';

/** Repositório em memória com a mesma regra de unicidade do banco (e-mail sem diferenciar maiúsculas). */
export class FakeCandidateRepository implements CandidateRepository {
  readonly items: Candidate[] = [];
  private nextId = 1;
  private clock = Date.UTC(2026, 8, 29, 12, 0, 0);

  async create(candidate: NewCandidate): Promise<Candidate> {
    const email = candidate.email.toLowerCase();
    if (this.items.some((c) => c.email.toLowerCase() === email)) throw new EmailAlreadyExistsError();
    const created: Candidate = { ...candidate, id: this.nextId++, createdAt: new Date((this.clock += 60_000)) };
    this.items.push(created);
    return created;
  }

  async list({ offset, limit }: { offset: number; limit: number }): Promise<{ items: CandidateSummary[]; total: number }> {
    const items = [...this.items]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
      .slice(offset, offset + limit)
      .map(({ id, fullName, email, areaOfInterest, createdAt }) => ({ id, fullName, email, areaOfInterest, createdAt }));
    return { items, total: this.items.length };
  }

  async findById(id: number): Promise<Candidate | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
}
