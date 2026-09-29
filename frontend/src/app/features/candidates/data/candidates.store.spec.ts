import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CandidatesApiService } from '../../../core/api/candidates-api.service';
import type { Candidate, CandidateSummary } from '../../../core/models/candidate.models';
import { CandidatesStore } from './candidates.store';

const summary: CandidateSummary = {
  id: 1,
  fullName: 'Maria Souza',
  email: 'maria@example.com',
  areaOfInterest: null,
  createdAt: '2026-09-29T12:00:00.000Z',
};
const candidate: Candidate = { ...summary, phone: null, professionalSummary: null };

describe('CandidatesStore', () => {
  let api: { list: ReturnType<typeof vi.fn>; getById: ReturnType<typeof vi.fn> };
  let store: CandidatesStore;

  beforeEach(() => {
    api = { list: vi.fn(), getById: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: CandidatesApiService, useValue: api }] });
    store = TestBed.inject(CandidatesStore);
  });

  describe('loadList', () => {
    it('passa por loading e termina em loaded com os itens', () => {
      const response = new Subject<CandidateSummary[]>();
      api.list.mockReturnValue(response);

      store.loadList();
      expect(store.listStatus()).toBe('loading');

      response.next([summary]);
      response.complete();
      expect(store.listStatus()).toBe('loaded');
      expect(store.items()).toEqual([summary]);
      expect(store.isEmpty()).toBe(false);
    });

    it('isEmpty é verdadeiro quando a API devolve []', () => {
      api.list.mockReturnValue(of([]));
      store.loadList();
      expect(store.isEmpty()).toBe(true);
    });

    it('vai para error quando a API falha', () => {
      api.list.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      store.loadList();
      expect(store.listStatus()).toBe('error');
      expect(store.isEmpty()).toBe(false);
    });
  });

  describe('loadById', () => {
    it('termina em loaded com o candidato', () => {
      api.getById.mockReturnValue(of(candidate));
      store.loadById(1);
      expect(api.getById).toHaveBeenCalledWith(1);
      expect(store.detailStatus()).toBe('loaded');
      expect(store.selected()).toEqual(candidate);
    });

    it('404 → not-found', () => {
      api.getById.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { error: { code: 'CANDIDATE_NOT_FOUND', message: 'Candidato não encontrado.' } },
            }),
        ),
      );
      store.loadById(999);
      expect(store.detailStatus()).toBe('not-found');
      expect(store.selected()).toBeNull();
    });

    it('outras falhas → error', () => {
      api.getById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      store.loadById(1);
      expect(store.detailStatus()).toBe('error');
    });
  });
});
