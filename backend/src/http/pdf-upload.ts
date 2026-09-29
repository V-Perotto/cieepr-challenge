import type { RequestHandler } from 'express';
import multer from 'multer';
import { FileRequiredError, FileTooLargeError } from '../domain/errors.js';

/** 5 MB exatos (5.242.880 bytes), conforme a spec. */
export const MAX_UPLOAD_BYTES = 5_242_880;

const single = multer({
  // Só memória: o PDF nunca toca o disco e é descartado após a resposta (FR-024).
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
}).single('file');

/** Recebe o campo multipart `file` e converte os erros do multer nos erros do contrato. */
export const pdfUpload: RequestHandler = (req, res, next) => {
  single(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new FileTooLargeError());
      return next(new FileRequiredError());
    }
    return next(err);
  });
};
