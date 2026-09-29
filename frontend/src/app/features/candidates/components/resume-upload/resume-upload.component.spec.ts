import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumeUploadComponent } from './resume-upload.component';

const pdf = (size = 1024, name = 'curriculo.pdf', type = 'application/pdf') =>
  new File([new Uint8Array(size)], name, { type });

describe('ResumeUploadComponent', () => {
  let fixture: ComponentFixture<ResumeUploadComponent>;
  let component: ResumeUploadComponent;
  let selected: File[];
  let rejected: string[];
  let removed: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ResumeUploadComponent] }).compileComponents();
    fixture = TestBed.createComponent(ResumeUploadComponent);
    component = fixture.componentInstance;
    selected = [];
    rejected = [];
    removed = 0;
    component.fileSelected.subscribe((f) => selected.push(f));
    component.rejected.subscribe((m) => rejected.push(m));
    component.fileRemoved.subscribe(() => removed++);
    await fixture.whenStable();
  });

  it('oferece a área de seleção de PDF', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input!.accept).toContain('application/pdf');
  });

  it.each([
    ['curriculo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['foto.jpg', 'image/jpeg'],
  ])('recusa %s com a mensagem de formato, sem emitir fileSelected', async (name, type) => {
    component.control.setValue(pdf(10, name, type));
    await fixture.whenStable();
    expect(rejected).toEqual(['Formato não aceito. Envie o currículo em PDF.']);
    expect(selected).toEqual([]);
  });

  it('recusa arquivo com mais de 5.242.880 bytes, sem emitir fileSelected', async () => {
    component.control.setValue(pdf(5_242_881));
    await fixture.whenStable();
    expect(rejected).toEqual(['O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.']);
    expect(selected).toEqual([]);
  });

  it('aceita PDF de exatamente 5.242.880 bytes e mostra o arquivo selecionado', async () => {
    const file = pdf(5_242_880);
    component.control.setValue(file);
    await fixture.whenStable();
    expect(selected).toEqual([file]);
    const shown = (fixture.nativeElement as HTMLElement).querySelector('tui-file');
    expect(shown).not.toBeNull();
    expect(shown!.textContent?.replace(/\s+/g, '')).toContain('curriculo.pdf');
  });

  it('aceita pela extensão .pdf mesmo sem MIME type', async () => {
    component.control.setValue(pdf(10, 'CURRICULO.PDF', ''));
    await fixture.whenStable();
    expect(selected).toHaveLength(1);
  });

  it('arquivos recusados pelo próprio input (accept) também geram a mensagem de formato', async () => {
    component['onNativeReject']([pdf(10, 'planilha.xlsx', 'application/vnd.ms-excel')]);
    await fixture.whenStable();
    expect(rejected).toEqual(['Formato não aceito. Envie o currículo em PDF.']);
  });

  it('remover o arquivo emite fileRemoved e volta para a seleção', async () => {
    component.control.setValue(pdf());
    await fixture.whenStable();
    component.remove();
    await fixture.whenStable();
    expect(removed).toBe(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('input[type="file"]')).not.toBeNull();
  });
});
