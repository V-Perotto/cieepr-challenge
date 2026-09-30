import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiLink } from '@taiga-ui/core';
import { CandidateFormComponent } from '../../components/candidate-form/candidate-form.component';

@Component({
  selector: 'app-candidate-create-page',
  imports: [RouterLink, TuiLink, CandidateFormComponent],
  templateUrl: './candidate-create-page.component.html',
  styleUrl: './candidate-create-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateCreatePageComponent {}
