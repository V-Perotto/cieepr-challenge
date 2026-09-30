import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CandidatesApiService } from '../../../core/api/candidates-api.service';
import type { Candidate, CandidatePage, CandidateSummary } from '../../../core/models/candidate.models';
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
    const page = (items: CandidateSummary[], total: number, pageNumber = 1): CandidatePage => ({
      items,
      page: pageNumber,
      pageSize: 10,
      total,
    });

    it('passa por loading e termina em loaded com os itens, a página e o total', () => {
      const response = new Subject<CandidatePage>();
      api.list.mockReturnValue(response);

      store.loadList(2);
      expect(api.list).toHaveBeenCalledWith(2, 10);
      expect(store.listStatus()).toBe('loading');

      response.next(page([summary], 11, 2));
      response.complete();
      expect(store.listStatus()).toBe('loaded');
      expect(store.items()).toEqual([summary]);
      expect(store.page()).toBe(2);
      expect(store.total()).toBe(11);
      expect(store.totalPages()).toBe(2);
      expect(store.isEmpty()).toBe(false);
    });

    it('usa a página 1 e 10 itens por padrão', () => {
      api.list.mockReturnValue(of(page([], 0)));
      store.loadList();
      expect(api.list).toHaveBeenCalledWith(1, 10);
      expect(store.pageSize()).toBe(10);
      expect(store.pageSizes).toEqual([10, 20, 50]);
    });

    it('guarda o tamanho de página pedido e calcula as páginas com ele', () => {
      api.list.mockReturnValue(of({ items: [summary], page: 1, pageSize: 20, total: 45 }));
      store.loadList(1, 20);
      expect(api.list).toHaveBeenCalledWith(1, 20);
      expect(store.pageSize()).toBe(20);
      expect(store.totalPages()).toBe(3);
    });

    it('isEmpty só é verdadeiro quando não há nenhum candidato cadastrado', () => {
      api.list.mockReturnValue(of(page([], 0)));
      store.loadList();
      expect(store.isEmpty()).toBe(true);
      expect(store.totalPages()).toBe(0);

      api.list.mockReturnValue(of(page([], 25, 9)));
      store.loadList(9);
      expect(store.isEmpty()).toBe(false);
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
