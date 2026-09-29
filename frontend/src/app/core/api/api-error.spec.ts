import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

describe('toApiError', () => {
  it('usa o corpo de erro do contrato quando existe', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: {
        error: { code: 'PDF_UNREADABLE', reason: 'encrypted', message: 'Protegido por senha.' },
      },
    });
    expect(toApiError(err)).toEqual({
      status: 422,
      code: 'PDF_UNREADABLE',
      reason: 'encrypted',
      message: 'Protegido por senha.',
      fields: [],
    });
  });

  it('preserva os erros por campo', () => {
    const fields = [{ field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: 'Já existe.' }];
    const err = new HttpErrorResponse({
      status: 409,
      error: { error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Já existe.', fields } },
    });
    expect(toApiError(err).fields).toEqual(fields);
  });

  it('trata 413 sem JSON (Nginx) como FILE_TOO_LARGE', () => {
    const err = new HttpErrorResponse({ status: 413, error: '<html>413 Request Entity Too Large</html>' });
    expect(toApiError(err)).toEqual({ status: 413, code: 'FILE_TOO_LARGE', fields: [] });
  });

  it('trata status 0 como falha de rede', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 })).code).toBe('NETWORK_ERROR');
  });

  it('trata qualquer outro erro sem corpo como INTERNAL_ERROR', () => {
    expect(toApiError(new HttpErrorResponse({ status: 502, error: 'Bad Gateway' })).code).toBe(
      'INTERNAL_ERROR',
    );
  });
});
