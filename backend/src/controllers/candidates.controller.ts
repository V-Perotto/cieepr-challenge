import { Router } from 'express';
import { toCandidateDto, toCandidateSummaryDto } from '../domain/candidate.js';
import type { CandidateService } from '../services/candidate.service.js';

/** /api/candidates: só tradução HTTP ⇄ service (constituição, Princípio V). */
export function createCandidatesRouter(service: CandidateService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const candidate = await service.create(req.body);
    res.status(201).location(`/api/candidates/${candidate.id}`).json(toCandidateDto(candidate));
  });

  router.get('/', async (_req, res) => {
    const candidates = await service.list();
    res.json(candidates.map(toCandidateSummaryDto));
  });

  router.get('/:id', async (req, res) => {
    const candidate = await service.getById(req.params.id);
    res.json(toCandidateDto(candidate));
  });

  return router;
}
