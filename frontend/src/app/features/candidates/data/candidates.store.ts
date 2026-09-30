import type { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { toApiError } from '../../../core/api/api-error';
import { CandidatesApiService } from '../../../core/api/candidates-api.service';
import type { Candidate, CandidateSummary } from '../../../core/models/candidate.models';

export type ListStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type DetailStatus = 'idle' | 'loading' | 'loaded' | 'not-found' | 'error';

/** Estado reativo (signals) da listagem e dos detalhes de candidatos. */
@Injectable({ providedIn: 'root' })
export class CandidatesStore {
  private readonly api = inject(CandidatesApiService);
  private listRequest?: Subscription;
  private detailRequest?: Subscription;

  /** Tamanhos de página oferecidos no rodapé da listagem (FR-025); o primeiro é o padrão. */
  readonly pageSizes = [10, 20, 50] as const;

  private readonly _items = signal<CandidateSummary[]>([]);
  private readonly _page = signal(1);
  private readonly _pageSize = signal<number>(this.pageSizes[0]);
  private readonly _total = signal(0);
  private readonly _listStatus = signal<ListStatus>('idle');
  private readonly _selected = signal<Candidate | null>(null);
  private readonly _detailStatus = signal<DetailStatus>('idle');

  readonly items = this._items.asReadonly();
  readonly page = this._page.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly total = this._total.asReadonly();
  readonly totalPages = computed(() => Math.ceil(this._total() / this._pageSize()));
  readonly listStatus = this._listStatus.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly detailStatus = this._detailStatus.asReadonly();
  /** Nenhum candidato cadastrado (e não apenas uma página vazia). */
  readonly isEmpty = computed(() => this._listStatus() === 'loaded' && this._total() === 0);

  loadList(page = 1, pageSize: number = this.pageSizes[0]): void {
    this.listRequest?.unsubscribe();
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._listStatus.set('loading');
    this.listRequest = this.api.list(page, pageSize).subscribe({
      next: (result) => {
        this._items.set(result.items);
        this._total.set(result.total);
        this._listStatus.set('loaded');
      },
      error: () => this._listStatus.set('error'),
    });
  }

  loadById(id: number): void {
    this.detailRequest?.unsubscribe();
    this._selected.set(null);
    this._detailStatus.set('loading');
    this.detailRequest = this.api.getById(id).subscribe({
      next: (candidate) => {
        this._selected.set(candidate);
        this._detailStatus.set('loaded');
      },
      error: (err: HttpErrorResponse) =>
        this._detailStatus.set(toApiError(err).code === 'CANDIDATE_NOT_FOUND' ? 'not-found' : 'error'),
    });
  }
}
