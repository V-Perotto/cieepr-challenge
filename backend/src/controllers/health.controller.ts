import { Router } from 'express';
import { DatabaseUnavailableError } from '../domain/errors.js';

/** GET /api/health: disponibilidade da API e do banco (usado pelo healthcheck do Docker). */
export function createHealthRouter(checkDatabase: () => Promise<boolean>): Router {
  const router = Router();
  router.get('/', async (_req, res) => {
    const up = await checkDatabase().catch(() => false);
    if (!up) throw new DatabaseUnavailableError();
    res.json({ status: 'ok', database: 'up' });
  });
  return router;
}
