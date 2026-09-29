import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MaskitoDirective } from '@maskito/angular';
import { TuiButton, TuiError, TuiInput, TuiLoader, TuiNotification, TuiNotificationService } from '@taiga-ui/core';
import { TuiBadge, TuiTextarea } from '@taiga-ui/kit';
import { finalize, type Subscription } from 'rxjs';
import { type ApiError, toApiError } from '../../../../core/api/api-error';
import { CandidatesApiService } from '../../../../core/api/candidates-api.service';
import { ResumeExtractionApiService } from '../../../../core/api/resume-extraction-api.service';
import type {
  Candidate,
  CandidateField,
  CandidateInput,
  ResumeExtractionResult,
  ResumeField,
} from '../../../../core/models/candidate.models';
import { formatPhone } from '../../../../shared/utils/phone';
import { CANDIDATE_VALIDATORS, firstErrorCode, MAX_LENGTH, normalizePhone } from '../../validation/candidate-validators';
import { PHONE_MASK } from '../../validation/phone-mask';
import { extractionErrorMessage, notIdentifiedMessage, RESUME_MESSAGES } from '../../validation/resume-messages';
import { validationMessage } from '../../validation/validation-messages';
import { ResumeUploadComponent } from '../resume-upload/resume-upload.component';

const FIELDS: readonly CandidateField[] = ['fullName', 'email', 'phone', 'areaOfInterest', 'professionalSummary'];
const RESUME_FIELDS: readonly ResumeField[] = ['fullName', 'email', 'phone'];

export const SAVE_SUCCESS_MESSAGE = 'Candidato cadastrado com sucesso!';
export const SAVE_FAILURE_MESSAGE =
  'Não foi possível salvar agora. Seus dados continuam no formulário; tente novamente.';

/** Estados da leitura do currículo (data-model.md §4). Nenhum bloqueia a edição ou o salvamento. */
export type ExtractionStatus = 'idle' | 'processing' | 'applied' | 'failed' | 'rejected';

type CandidateFormGroup = FormGroup<Record<CandidateField, FormControl<string>>>;
type StatusAppearance = 'info' | 'positive' | 'warning' | 'negative';

@Component({
  selector: 'app-candidate-form',
  imports: [
    ReactiveFormsModule,
    MaskitoDirective,
    TuiBadge,
    TuiButton,
    TuiError,
    TuiInput,
    TuiLoader,
    TuiNotification,
    TuiTextarea,
    ResumeUploadComponent,
  ],
  templateUrl: './candidate-form.component.html',
  styleUrl: './candidate-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CandidateFormComponent {
  private readonly api = inject(CandidatesApiService);
  private readonly resumeApi = inject(ResumeExtractionApiService);
  private readonly notifications = inject(TuiNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly resumeUpload = viewChild(ResumeUploadComponent);

  /** Emitido após cada cadastro salvo com sucesso. */
  readonly saved = output<Candidate>();

  protected readonly maxLength = MAX_LENGTH;
  protected readonly phoneMask = PHONE_MASK;
  protected readonly saving = signal(false);

  protected readonly form: CandidateFormGroup = new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: CANDIDATE_VALIDATORS.fullName }),
    email: new FormControl('', { nonNullable: true, validators: CANDIDATE_VALIDATORS.email }),
    phone: new FormControl('', { nonNullable: true, validators: CANDIDATE_VALIDATORS.phone }),
    areaOfInterest: new FormControl('', { nonNullable: true, validators: CANDIDATE_VALIDATORS.areaOfInterest }),
    professionalSummary: new FormControl('', {
      nonNullable: true,
      validators: CANDIDATE_VALIDATORS.professionalSummary,
    }),
  });

  // Qualquer mudança de valor, status ou "touched" do formulário recalcula as mensagens (zoneless).
  private readonly formEvents = toSignal(this.form.events);

  /** Mensagem de erro por campo; só aparece depois que o campo foi tocado. */
  protected readonly errors = computed(() => {
    this.formEvents();
    const result: Partial<Record<CandidateField, string>> = {};
    for (const field of FIELDS) {
      const control = this.form.controls[field];
      const code = control.touched ? firstErrorCode(control.errors) : null;
      if (code === 'server') result[field] = String(control.errors?.['server']);
      else if (code) result[field] = validationMessage(field, code);
    }
    return result;
  });

  // Estado da leitura do currículo.
  protected readonly extractionStatus = signal<ExtractionStatus>('idle');
  protected readonly extractionMessage = signal<string | null>(null);
  protected readonly extractionAppearance = signal<StatusAppearance>('info');
  protected readonly autofilled = signal<ReadonlySet<ResumeField>>(new Set());
  private extraction?: Subscription;
  private applyingExtraction = false;

  constructor() {
    // Uma edição feita pela pessoa remove a marcação "Preenchido pelo currículo" do campo.
    for (const field of RESUME_FIELDS) {
      this.form.controls[field].valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
        if (this.applyingExtraction || !this.autofilled().has(field)) return;
        this.autofilled.update((set) => new Set([...set].filter((f) => f !== field)));
      });
    }
    this.destroyRef.onDestroy(() => this.extraction?.unsubscribe());
  }

  protected submit(): void {
    if (this.saving()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    // Salvar é sempre possível; uma leitura de PDF ainda em andamento é cancelada e descartada.
    this.cancelExtraction();

    this.saving.set(true);
    this.api
      .create(this.toInput())
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (candidate) => {
          this.notify(SAVE_SUCCESS_MESSAGE, 'positive');
          this.form.reset();
          this.resetResume();
          this.saved.emit(candidate);
        },
        error: (err: HttpErrorResponse) => this.handleSaveError(toApiError(err)),
      });
  }

  protected onResumeSelected(file: File): void {
    this.cancelExtraction();
    this.setStatus('processing', RESUME_MESSAGES.processing, 'info');
    this.extraction = this.resumeApi.extract(file).subscribe({
      next: (result) => this.applyExtraction(result),
      error: (err: HttpErrorResponse) =>
        this.setStatus('failed', extractionErrorMessage(toApiError(err)), 'negative'),
    });
  }

  protected onResumeRemoved(): void {
    this.cancelExtraction();
  }

  protected onResumeRejected(message: string): void {
    this.cancelExtraction();
    this.setStatus('rejected', message, 'negative');
  }

  /** Preenche só os campos vazios (FR-017) e informa o que não foi identificado (FR-018). */
  private applyExtraction(result: ResumeExtractionResult): void {
    const filled = new Set(this.autofilled());
    this.applyingExtraction = true;
    try {
      for (const field of result.identified) {
        const value = result.fields[field];
        const control = this.form.controls[field];
        if (!value || control.value.trim() !== '') continue;
        control.setValue(field === 'phone' ? formatPhone(value) : value);
        control.markAsTouched();
        filled.add(field);
      }
    } finally {
      this.applyingExtraction = false;
    }
    this.autofilled.set(filled);

    if (result.identified.length === 0) {
      this.setStatus('applied', RESUME_MESSAGES.noneIdentified, 'warning');
    } else if (result.notIdentified.length > 0) {
      this.setStatus('applied', notIdentifiedMessage(result.notIdentified), 'warning');
    } else {
      this.setStatus('applied', RESUME_MESSAGES.allIdentified, 'positive');
    }
  }

  private cancelExtraction(): void {
    this.extraction?.unsubscribe();
    this.extraction = undefined;
    this.setStatus('idle', null, 'info');
  }

  private resetResume(): void {
    this.cancelExtraction();
    this.autofilled.set(new Set());
    this.resumeUpload()?.clear();
  }

  private setStatus(status: ExtractionStatus, message: string | null, appearance: StatusAppearance): void {
    this.extractionStatus.set(status);
    this.extractionMessage.set(message);
    this.extractionAppearance.set(appearance);
  }

  private toInput(): CandidateInput {
    const value = this.form.getRawValue();
    const optional = (v: string) => (v.trim() ? v.trim() : null);
    return {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim() ? normalizePhone(value.phone) : null,
      areaOfInterest: optional(value.areaOfInterest),
      professionalSummary: optional(value.professionalSummary),
    };
  }

  private handleSaveError(error: ApiError): void {
    if (error.fields.length > 0) {
      for (const { field, message } of error.fields) {
        const control = this.form.controls[field];
        control.setErrors({ ...control.errors, server: message });
        control.markAsTouched();
      }
      return;
    }
    this.notify(SAVE_FAILURE_MESSAGE, 'negative');
  }

  private notify(message: string, appearance: 'positive' | 'negative'): void {
    this.notifications.open(message, { appearance }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }
}
