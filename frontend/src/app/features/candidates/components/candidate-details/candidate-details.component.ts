import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Candidate } from '../../../../core/models/candidate.models';
import { PhoneFormatPipe } from '../../../../shared/pipes/phone-format.pipe';

@Component({
  selector: 'app-candidate-details',
  imports: [DatePipe, PhoneFormatPipe],
  templateUrl: './candidate-details.component.html',
  styleUrl: './candidate-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateDetailsComponent {
  readonly candidate = input.required<Candidate>();
}
