import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiLink } from '@taiga-ui/core';
import type { CandidateSummary } from '../../../../core/models/candidate.models';

@Component({
  selector: 'app-candidate-table',
  imports: [DatePipe, RouterLink, TuiLink, TuiTable],
  templateUrl: './candidate-table.component.html',
  styleUrl: './candidate-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateTableComponent {
  private readonly router = inject(Router);

  readonly items = input.required<CandidateSummary[]>();

  /** A linha inteira é clicável; o link do nome garante o acesso pelo teclado. */
  protected open(id: number): void {
    void this.router.navigate(['/candidatos', id]);
  }
}
