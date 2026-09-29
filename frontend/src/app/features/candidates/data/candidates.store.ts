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

  private readonly _items = signal<CandidateSummary[]>([]);
  private readonly _listStatus = signal<ListStatus>('idle');
  private readonly _selected = signal<Candidate | null>(null);
  private readonly _detailStatus = signal<DetailStatus>('idle');

  readonly items = this._items.asReadonly();
  readonly listStatus = this._listStatus.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly detailStatus = this._detailStatus.asReadonly();
  readonly isEmpty = computed(() => this._listStatus() === 'loaded' && this._items().length === 0);

  loadList(): void {
    this.listRequest?.unsubscribe();
    this._listStatus.set('loading');
    this.listRequest = this.api.list().subscribe({
      next: (items) => {
        this._items.set(items);
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
