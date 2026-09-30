import { HttpErrorResponse } from '@angular/common/http';
import { By } from '@angular/platform-browser';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { TuiNotificationService } from '@taiga-ui/core';
import { TuiTextareaComponent } from '@taiga-ui/kit';
import { of, Subject, throwError } from 'rxjs';
import { CandidatesApiService } from '../../../../core/api/candidates-api.service';
import { ResumeExtractionApiService } from '../../../../core/api/resume-extraction-api.service';
import type { Candidate, ResumeExtractionResult } from '../../../../core/models/candidate.models';
import { ResumeUploadComponent } from '../resume-upload/resume-upload.component';
import { CandidateFormComponent } from './candidate-form.component';

const created: Candidate = {
  id: 1,
  fullName: 'Maria Souza',
  email: 'maria@example.com',
  phone: '41999999999',
  areaOfInterest: null,
  professionalSummary: null,
  createdAt: '2026-09-29T12:00:00.000Z',
};

describe('CandidateFormComponent', () => {
  let fixture: ComponentFixture<CandidateFormComponent>;
  let el: HTMLElement;
  let api: { create: ReturnType<typeof vi.fn> };
  let notifications: { open: ReturnType<typeof vi.fn> };
  let resumeApi: { extract: ReturnType<typeof vi.fn> };

  const input = (name: string) =>
    el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[formcontrolname="${name}"]`)!;

  async function type(name: string, value: string) {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await fixture.whenStable();
  }

  const errorText = () => el.textContent ?? '';

  beforeEach(async () => {
    api = { create: vi.fn() };
    notifications = { open: vi.fn(() => of(undefined)) };
    resumeApi = { extract: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CandidateFormComponent],
      providers: [
        { provide: CandidatesApiService, useValue: api },
        { provide: TuiNotificationService, useValue: notifications },
        { provide: ResumeExtractionApiService, useValue: resumeApi },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CandidateFormComponent);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('renderiza os 5 campos com os rótulos do ui-contract', () => {
    const labels = [...el.querySelectorAll('label')].map((l) => l.textContent?.trim());
    expect(labels).toEqual(
      expect.arrayContaining([
        'Nome completo *',
        'E-mail *',
        'Telefone',
        'Área ou cargo de interesse',
        'Resumo profissional',
      ]),
    );
    for (const name of ['fullName', 'email', 'phone', 'areaOfInterest', 'professionalSummary']) {
      expect(input(name)).not.toBeNull();
    }
  });

  it('mostra o erro do campo ao perder o foco', async () => {
    await type('email', 'maria@');
    expect(errorText()).toContain('Informe um e-mail válido, como nome@empresa.com.');
  });

  it('ao salvar vazio mostra os erros dos obrigatórios e não chama a API', async () => {
    await submit();
    expect(errorText()).toContain('Informe o nome completo.');
    expect(errorText()).toContain('Informe o e-mail.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('mostra erro de telefone sem DDD', async () => {
    await type('phone', '99999-9999');
    expect(errorText()).toContain('Informe o telefone com DDD, com 10 ou 11 dígitos');
  });

  it('envia os dados normalizados, confirma o sucesso e limpa o formulário', async () => {
    api.create.mockReturnValue(of(created));
    await type('fullName', '  Maria Souza ');
    await type('email', 'maria@example.com');
    await type('phone', '(41) 99999-9999');
    await type('areaOfInterest', '   ');
    await submit();

    expect(api.create).toHaveBeenCalledWith({
      fullName: 'Maria Souza',
      email: 'maria@example.com',
      phone: '41999999999',
      areaOfInterest: null,
      professionalSummary: null,
    });
    expect(notifications.open).toHaveBeenCalledWith(
      'Candidato cadastrado com sucesso!',
      expect.objectContaining({ appearance: 'positive' }),
    );
    expect(input('fullName').value).toBe('');
    expect(input('email').value).toBe('');
  });

  it('aplica nos campos os erros 400 do servidor', async () => {
    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Alguns campos precisam de correção.',
                fields: [{ field: 'fullName', code: 'MAX_LENGTH', message: 'O nome pode ter no máximo 250 caracteres.' }],
              },
            },
          }),
      ),
    );
    await type('fullName', 'Maria');
    await type('email', 'maria@example.com');
    await submit();
    expect(errorText()).toContain('O nome pode ter no máximo 250 caracteres.');
  });

  it('409: mostra o e-mail duplicado no campo e mantém os dados', async () => {
    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              error: {
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'Já existe um candidato com este e-mail.',
                fields: [{ field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: 'Já existe um candidato com este e-mail.' }],
              },
            },
          }),
      ),
    );
    await type('fullName', 'Maria');
    await type('email', 'MARIA@example.com');
    await submit();

    expect(errorText()).toContain('Já existe um candidato com este e-mail.');
    expect(input('fullName').value).toBe('Maria');
    expect(input('email').value).toBe('MARIA@example.com');
  });

  it('500: avisa que não salvou e mantém os dados', async () => {
    api.create.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await type('fullName', 'Maria');
    await type('email', 'maria@example.com');
    await submit();

    expect(notifications.open).toHaveBeenCalledWith(
      'Não foi possível salvar agora. Seus dados continuam no formulário; tente novamente.',
      expect.objectContaining({ appearance: 'negative' }),
    );
    expect(input('fullName').value).toBe('Maria');
  });

  it('dois cliques rápidos em Salvar geram uma única chamada', async () => {
    const pending = new Subject<Candidate>();
    api.create.mockReturnValue(pending);
    await type('fullName', 'Maria');
    await type('email', 'maria@example.com');

    const button = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.click();
    button.click();
    await fixture.whenStable();

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);

    pending.next(created);
    pending.complete();
    await fixture.whenStable();
    expect(button.disabled).toBe(false);
  });

  it('o botão Salvar começa habilitado e tem o ícone de salvar', () => {
    const button = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('iconStart')).toBe('@tui.save');
  });

  describe('Resumo profissional', () => {
    it('barra a digitação e a colagem acima de 1000 caracteres (maxlength nativo)', () => {
      expect(input('professionalSummary').getAttribute('maxlength')).toBe('1000');
    });

    it('cresce com o conteúdo de 4 até 40 linhas antes de rolar', () => {
      const textarea = fixture.debugElement
        .query(By.css('#candidate-professionalSummary'))
        .injector.get(TuiTextareaComponent);
      expect(textarea.min()).toBe(4);
      expect(textarea.max()).toBe(40);
    });
  });

  describe('currículo PDF', () => {
    const file = new File([new Uint8Array(10)], 'curriculo.pdf', { type: 'application/pdf' });
    const full: ResumeExtractionResult = {
      fields: { fullName: 'João Pereira', email: 'joao@example.org', phone: '4133334444' },
      identified: ['fullName', 'email', 'phone'],
      notIdentified: [],
      pagesRead: 1,
    };
    const upload = () =>
      fixture.debugElement.query(By.directive(ResumeUploadComponent)).componentInstance as ResumeUploadComponent;
    const status = () => el.querySelector('[data-testid="resume-status"]')?.textContent?.trim() ?? '';

    async function select(response: unknown) {
      resumeApi.extract.mockReturnValue(response);
      upload().fileSelected.emit(file);
      await fixture.whenStable();
    }

    it('processando: mostra o aviso, mantém os campos editáveis e Salvar habilitado', async () => {
      await select(new Subject<ResumeExtractionResult>());
      expect(status()).toBe('Lendo o currículo... Você pode continuar preenchendo o formulário.');
      expect(input('fullName').disabled).toBe(false);
      expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
      expect(el.querySelector('[data-testid="resume-status"]')?.getAttribute('aria-live')).toBe('polite');
    });

    it('preenche só os campos vazios e marca os que vieram do currículo', async () => {
      await type('fullName', 'Nome Digitado');
      await select(of(full));

      expect(resumeApi.extract).toHaveBeenCalledWith(file);
      expect(input('fullName').value).toBe('Nome Digitado');
      expect(input('email').value).toBe('joao@example.org');
      expect(input('phone').value).toBe('(41) 3333-4444');
      expect(status()).toBe('Dados do currículo preenchidos. Confira as informações antes de salvar.');
      const marks = el.querySelectorAll('[data-testid="autofilled"]');
      expect(marks).toHaveLength(2);
      expect(marks[0]!.textContent?.trim()).toBe('Preenchido pelo currículo');
    });

    it('a marcação some quando a pessoa edita o campo', async () => {
      await select(of(full));
      expect(el.querySelectorAll('[data-testid="autofilled"]')).toHaveLength(3);
      await type('email', 'outro@example.org');
      expect(el.querySelectorAll('[data-testid="autofilled"]')).toHaveLength(2);
    });

    it.each([
      [['phone'], 'Não encontramos o telefone no currículo. Preencha manualmente.'],
      [['fullName', 'phone'], 'Não encontramos o nome e o telefone no currículo. Preencha manualmente.'],
    ] as const)('campos não identificados %j → aviso de preenchimento manual', async (missing, message) => {
      const fields = { ...full.fields };
      for (const f of missing) fields[f] = null;
      await select(
        of({
          ...full,
          fields,
          identified: full.identified.filter((f) => !missing.includes(f as never)),
          notIdentified: [...missing],
        }),
      );
      expect(status()).toBe(message);
    });

    it('nenhum campo identificado → aviso geral', async () => {
      await select(
        of({
          fields: { fullName: null, email: null, phone: null },
          identified: [],
          notIdentified: ['fullName', 'email', 'phone'],
          pagesRead: 1,
        }),
      );
      expect(status()).toBe(
        'Não encontramos nome, e-mail nem telefone no currículo. Preencha os dados manualmente.',
      );
    });

    it.each([
      [413, undefined, 'O arquivo tem mais de 5 MB. Envie um PDF de até 5 MB.'],
      [415, 'INVALID_FILE_TYPE', 'Formato não aceito. Envie o currículo em PDF.'],
      [422, 'encrypted', 'Não foi possível ler o PDF porque ele está protegido por senha. Preencha os dados manualmente.'],
      [422, 'corrupted', 'Não foi possível ler o PDF. O arquivo pode estar corrompido. Preencha os dados manualmente.'],
      [422, 'no_text', 'Não encontramos texto no PDF. Ele pode ser uma imagem digitalizada. Preencha os dados manualmente.'],
      [422, 'timeout', 'A leitura do PDF demorou mais que o esperado. Preencha os dados manualmente ou tente outro arquivo.'],
      [500, undefined, 'Não foi possível ler o PDF agora. Preencha os dados manualmente.'],
    ])('erro %s (%s) → mensagem do ui-contract', async (httpStatus, detail, message) => {
      const body =
        httpStatus === 422
          ? { error: { code: 'PDF_UNREADABLE', reason: detail, message: 'x' } }
          : httpStatus === 415
            ? { error: { code: 'INVALID_FILE_TYPE', message: 'x' } }
            : '<html>erro</html>';
      await select(throwError(() => new HttpErrorResponse({ status: httpStatus, error: body })));
      expect(status()).toBe(message);
    });

    it('arquivo recusado no navegador mostra a mensagem e não chama a API', async () => {
      upload().rejected.emit('Formato não aceito. Envie o currículo em PDF.');
      await fixture.whenStable();
      expect(status()).toBe('Formato não aceito. Envie o currículo em PDF.');
      expect(resumeApi.extract).not.toHaveBeenCalled();
    });

    it('salvar durante o processamento cancela a leitura e ignora o resultado tardio', async () => {
      const pending = new Subject<ResumeExtractionResult>();
      await select(pending);
      api.create.mockReturnValue(of(created));
      await type('fullName', 'Maria Souza');
      await type('email', 'maria@example.com');
      await submit();

      expect(pending.observed).toBe(false);
      pending.next(full);
      await fixture.whenStable();
      expect(input('email').value).toBe('');
      expect(status()).toBe('');
    });

    it('trocar o PDF processa o novo arquivo e preenche só os campos ainda vazios', async () => {
      await select(
        of({ ...full, fields: { ...full.fields, phone: null }, identified: ['fullName', 'email'], notIdentified: ['phone'] }),
      );
      const second: ResumeExtractionResult = {
        fields: { fullName: 'Outro Nome', email: 'outro@example.org', phone: '41999998888' },
        identified: ['fullName', 'email', 'phone'],
        notIdentified: [],
        pagesRead: 1,
      };
      await select(of(second));

      expect(resumeApi.extract).toHaveBeenCalledTimes(2);
      expect(input('fullName').value).toBe('João Pereira');
      expect(input('email').value).toBe('joao@example.org');
      expect(input('phone').value).toBe('(41) 99999-8888');
    });

    it('remover o arquivo mantém os valores já preenchidos', async () => {
      await select(of(full));
      upload().fileRemoved.emit();
      await fixture.whenStable();
      expect(input('email').value).toBe('joao@example.org');
      expect(status()).toBe('');
    });
  });
});
