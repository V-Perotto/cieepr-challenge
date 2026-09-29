import { formatDate } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { CandidateSummary } from '../../../../core/models/candidate.models';
import { CandidateTableComponent } from './candidate-table.component';

const items: CandidateSummary[] = [
  { id: 2, fullName: 'João Pereira', email: 'joao@example.org', areaOfInterest: null, createdAt: '2026-09-29T15:30:00.000Z' },
  { id: 1, fullName: 'Maria Souza', email: 'maria@example.com', areaOfInterest: 'RH', createdAt: '2026-09-28T09:05:00.000Z' },
];

describe('CandidateTableComponent', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [CandidateTableComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(CandidateTableComponent);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('tem as colunas do ui-contract', async () => {
    const el = await render();
    const headers = [...el.querySelectorAll('th')].map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Nome', 'E-mail', 'Área ou cargo de interesse', 'Cadastrado em']);
  });

  it('renderiza uma linha por candidato, com a data em dd/MM/yyyy HH:mm', async () => {
    const el = await render();
    const rows = [...el.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(2);
    const cells = [...rows[0]!.querySelectorAll('td')].map((td) => td.textContent?.trim());
    expect(cells).toEqual([
      'João Pereira',
      'joao@example.org',
      'Não informado',
      formatDate(items[0]!.createdAt, 'dd/MM/yyyy HH:mm', 'pt-BR'),
    ]);
  });

  it('cada linha tem um link focável para os detalhes', async () => {
    const el = await render();
    const links = [...el.querySelectorAll<HTMLAnchorElement>('tbody a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/candidatos/2', '/candidatos/1']);
  });

  it('clicar na linha navega para os detalhes (1 clique)', async () => {
    const el = await render();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    el.querySelectorAll<HTMLTableRowElement>('tbody tr')[1]!.click();
    expect(navigate).toHaveBeenCalledWith(['/candidatos', 1]);
  });
});
