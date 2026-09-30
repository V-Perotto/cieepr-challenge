import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiLink, TuiLoader } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { CandidateDetailsComponent } from '../../components/candidate-details/candidate-details.component';
import { CandidatesStore } from '../../data/candidates.store';

@Component({
  selector: 'app-candidate-detail-page',
  imports: [RouterLink, TuiBlockStatus, TuiButton, TuiLink, TuiLoader, CandidateDetailsComponent],
  templateUrl: './candidate-detail-page.component.html',
  styleUrl: './candidate-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateDetailPageComponent {
  protected readonly store = inject(CandidatesStore);

  /** Parâmetro `:id` da rota (withComponentInputBinding). Ids inválidos viram 404 no backend. */
  readonly id = input.required<string>();

  /** "Voltar para a lista" retorna à página e ao tamanho de página em que a pessoa estava. */
  protected readonly listQueryParams = computed(() => ({
    ...(this.store.page() > 1 ? { pagina: this.store.page() } : {}),
    ...(this.store.pageSize() !== 10 ? { itens: this.store.pageSize() } : {}),
  }));

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.store.loadById(id));
    });
  }
}
