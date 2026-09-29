import { Router } from 'express';
import { pdfUpload } from '../http/pdf-upload.js';
import type { ResumeExtractionService } from '../services/resume-extraction.service.js';

/** POST /api/resume-extractions: recebe o PDF e devolve a sugestão de campos. Nada é gravado. */
export function createResumeExtractionsRouter(service: ResumeExtractionService): Router {
  const router = Router();
  router.post('/', pdfUpload, async (req, res) => {
    const result = await service.extract(req.file);
    res.json(result);
  });
  return router;
}
