import { Router } from 'express';
import { DatabaseUnavailableError } from '../domain/errors.js';
import type { HealthService } from '../services/health.service.js';

/** GET /api/health: disponibilidade da API e do banco (usado pelo healthcheck do Docker). */
export function createHealthRouter(service: HealthService): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    if (!(await service.isDatabaseUp())) throw new DatabaseUnavailableError();
    res.json({ status: 'ok', database: 'up' });
  });
  return router;
}
