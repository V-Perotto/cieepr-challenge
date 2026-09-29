import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { TuiBlockStatus } from '@taiga-ui/layout';
import { CandidateTableComponent } from '../../components/candidate-table/candidate-table.component';
import { CandidatesStore } from '../../data/candidates.store';

@Component({
  selector: 'app-candidate-list-page',
  imports: [RouterLink, TuiBlockStatus, TuiButton, TuiLoader, CandidateTableComponent],
  templateUrl: './candidate-list-page.component.html',
  styleUrl: './candidate-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateListPageComponent implements OnInit {
  protected readonly store = inject(CandidatesStore);

  ngOnInit(): void {
    this.store.loadList();
  }
}
