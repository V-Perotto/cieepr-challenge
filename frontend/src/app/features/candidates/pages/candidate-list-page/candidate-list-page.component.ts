import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { TuiContext, TuiStringHandler } from '@taiga-ui/cdk';
import { TuiButton, TuiDropdown, TuiLoader } from '@taiga-ui/core';
import { TuiButtonSelect, TuiDataListWrapper, TuiPagination } from '@taiga-ui/kit';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { CandidateTableComponent } from '../../components/candidate-table/candidate-table.component';
import { CandidatesStore } from '../../data/candidates.store';

/** `?pagina=` válido (inteiro ≥ 1); qualquer outro valor abre a página 1. */
function toPage(value: string | undefined): number {
  return value && /^[1-9][0-9]{0,5}$/.test(value) ? Number(value) : 1;
}

@Component({
  selector: 'app-candidate-list-page',
  imports: [
    FormsModule,
    RouterLink,
    TuiBlockStatus,
    TuiButton,
    TuiButtonSelect,
    TuiDataListWrapper,
    TuiDropdown,
    TuiLoader,
    TuiPagination,
    CandidateTableComponent,
  ],
  templateUrl: './candidate-list-page.component.html',
  styleUrl: './candidate-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateListPageComponent {
  protected readonly store = inject(CandidatesStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Query params `?pagina=N&itens=M` (withComponentInputBinding). */
  readonly pagina = input<string>();
  readonly itens = input<string>();

  /** "25 candidatos" (no lugar do "999 rows" do exemplo da Taiga). */
  protected readonly totalLabel = computed(() => {
    const total = this.store.total();
    return `${total} ${total === 1 ? 'candidato' : 'candidatos'}`;
  });

  /** "Exibindo 11–20": intervalo da página atual. */
  protected readonly rangeLabel = computed(() => {
    const from = (this.store.page() - 1) * this.store.pageSize() + 1;
    return `Exibindo ${from}–${from + this.store.items().length - 1}`;
  });

  protected readonly sizeContent: TuiStringHandler<TuiContext<number>> = ({ $implicit }) =>
    `${$implicit} por página`;

  constructor() {
    effect(() => {
      const page = toPage(this.pagina());
      const size = this.toSize(this.itens());
      untracked(() => this.store.loadList(page, size));
    });

    // Página além da última (ex.: depois de digitar ?pagina=99): vai para a última.
    effect(() => {
      if (this.store.listStatus() !== 'loaded' || this.store.items().length > 0 || this.store.total() === 0) return;
      const last = this.store.totalPages();
      untracked(() => this.goTo(last, true));
    });
  }

  protected goTo(page: number, replaceUrl = false): void {
    this.navigate({ pagina: page > 1 ? page : null }, replaceUrl);
  }

  /** Troca o tamanho mantendo na tela o primeiro item que estava sendo exibido. */
  protected changeSize(size: number): void {
    const firstItem = (this.store.page() - 1) * this.store.pageSize();
    const page = Math.floor(firstItem / size) + 1;
    this.navigate({ pagina: page > 1 ? page : null, itens: size !== this.store.pageSizes[0] ? size : null });
  }

  /** `?itens=` só aceita os tamanhos oferecidos (10, 20 ou 50); o resto usa o padrão. */
  private toSize(value: string | undefined): number {
    const size = Number(value);
    return (this.store.pageSizes as readonly number[]).includes(size) ? size : this.store.pageSizes[0];
  }

  private navigate(queryParams: Record<string, number | null>, replaceUrl = false): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge', replaceUrl });
  }
}
