import { formatDate } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import type { Candidate } from '../../../../core/models/candidate.models';
import { CandidateDetailsComponent } from './candidate-details.component';

const full: Candidate = {
  id: 7,
  fullName: 'Conceição Aparecida da Silva',
  email: 'conceicao@example.com',
  phone: '41998765432',
  areaOfInterest: 'Recursos Humanos',
  professionalSummary: 'Linha 1\nLinha 2',
  createdAt: '2026-09-29T12:34:00.000Z',
};

async function render(candidate: Candidate) {
  await TestBed.configureTestingModule({ imports: [CandidateDetailsComponent] }).compileComponents();
  const fixture = TestBed.createComponent(CandidateDetailsComponent);
  fixture.componentRef.setInput('candidate', candidate);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const value = (term: string) =>
    [...el.querySelectorAll('dt')].find((dt) => dt.textContent?.trim() === term)?.nextElementSibling;
  return { el, value };
}

describe('CandidateDetailsComponent', () => {
  it('mostra todos os campos, com telefone formatado e data de cadastro', async () => {
    const { value } = await render(full);
    expect(value('Nome completo')?.textContent?.trim()).toBe('Conceição Aparecida da Silva');
    expect(value('E-mail')?.textContent?.trim()).toBe('conceicao@example.com');
    expect(value('Telefone')?.textContent?.trim()).toBe('(41) 99876-5432');
    expect(value('Área ou cargo de interesse')?.textContent?.trim()).toBe('Recursos Humanos');
    expect(value('Cadastrado em')?.textContent?.trim()).toBe(
      formatDate(full.createdAt, 'dd/MM/yyyy HH:mm', 'pt-BR'),
    );
  });

  it('preserva as quebras de linha do resumo', async () => {
    const { value } = await render(full);
    const summary = value('Resumo profissional') as HTMLElement;
    expect(summary.textContent).toContain('Linha 1\nLinha 2');
    expect(summary.classList).toContain('details__summary');
  });

  it('mostra "Não informado" nos opcionais vazios', async () => {
    const { value } = await render({ ...full, phone: null, areaOfInterest: null, professionalSummary: null });
    expect(value('Telefone')?.textContent?.trim()).toBe('Não informado');
    expect(value('Área ou cargo de interesse')?.textContent?.trim()).toBe('Não informado');
    expect(value('Resumo profissional')?.textContent?.trim()).toBe('Não informado');
  });
});
