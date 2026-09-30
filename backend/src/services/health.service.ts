import type { DatabaseHealthRepository } from '../repositories/database-health.repository.js';

/** Disponibilidade da aplicação, usada pelo GET /api/health e pelo healthcheck do Docker. */
export class HealthService {
  constructor(private readonly repository: DatabaseHealthRepository) {}

  /** Nunca lança: qualquer falha de conexão conta como banco indisponível. */
  async isDatabaseUp(): Promise<boolean> {
    return this.repository.ping().catch(() => false);
  }
}
