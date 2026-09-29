import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiFiles } from '@taiga-ui/kit';
import { pdfFileProblem } from '../../validation/pdf-file';
import { RESUME_MESSAGES } from '../../validation/resume-messages';

/** Seleção opcional do currículo em PDF, com checagem de tipo e tamanho antes do envio. */
@Component({
  selector: 'app-resume-upload',
  imports: [ReactiveFormsModule, TuiFiles],
  templateUrl: './resume-upload.component.html',
  styleUrl: './resume-upload.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResumeUploadComponent {
  readonly fileSelected = output<File>();
  readonly fileRemoved = output<void>();
  /** Mensagem do ui-contract quando o arquivo é recusado no navegador. */
  readonly rejected = output<string>();

  readonly control = new FormControl<File | null>(null);
  protected readonly selectedFile = signal<File | null>(null);

  constructor() {
    this.control.valueChanges.pipe(takeUntilDestroyed()).subscribe((file) => {
      if (file) this.handle(file);
    });
  }

  remove(): void {
    this.clear();
    this.fileRemoved.emit();
  }

  /** Volta ao estado inicial sem emitir eventos (usado pelo formulário depois de salvar). */
  clear(): void {
    this.control.setValue(null, { emitEvent: false });
    this.selectedFile.set(null);
  }

  /** Arquivos que o próprio input recusou pelo atributo accept. */
  protected onNativeReject(files: readonly File[]): void {
    const file = files[0];
    this.rejected.emit(file ? (pdfFileProblem(file) ?? RESUME_MESSAGES.invalidType) : RESUME_MESSAGES.invalidType);
  }

  private handle(file: File): void {
    const problem = pdfFileProblem(file);
    if (problem) {
      this.clear();
      this.rejected.emit(problem);
      return;
    }
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }
}
