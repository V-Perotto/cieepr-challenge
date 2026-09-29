import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CandidateSummary } from '../../../../core/models/candidate.models';
import { CandidatesStore } from '../../data/candidates.store';
import { CandidateListPageComponent } from './candidate-list-page.component';

function fakeStore(status: 'loading' | 'loaded' | 'error', items: CandidateSummary[] = []) {
  const listStatus = signal(status);
  const itemsSignal = signal(items);
  return {
    listStatus,
    items: itemsSignal,
    isEmpty: computed(() => listStatus() === 'loaded' && itemsSignal().length === 0),
    loadList: vi.fn(),
  };
}

async function render(store: ReturnType<typeof fakeStore>) {
  await TestBed.configureTestingModule({
    imports: [CandidateListPageComponent],
    providers: [provideRouter([]), { provide: CandidatesStore, useValue: store }],
  }).compileComponents();
  const fixture = TestBed.createComponent(CandidateListPageComponent);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CandidateListPageComponent', () => {
  it('carrega a lista ao abrir e tem o botão "Novo candidato"', async () => {
    const store = fakeStore('loading');
    const el = await render(store);
    expect(store.loadList).toHaveBeenCalledTimes(1);
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Novo candidato');
    expect(link?.getAttribute('href')).toBe('/candidatos/novo');
  });

  it('lista vazia: mensagem e atalho para o primeiro cadastro', async () => {
    const el = await render(fakeStore('loaded', []));
    expect(el.textContent).toContain('Nenhum candidato cadastrado ainda.');
    const link = [...el.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === 'Cadastrar o primeiro candidato',
    );
    expect(link?.getAttribute('href')).toBe('/candidatos/novo');
    expect(el.querySelector('app-candidate-table')).toBeNull();
  });

  it('erro: mensagem e botão "Tentar de novo" que recarrega', async () => {
    const store = fakeStore('error');
    const el = await render(store);
    expect(el.textContent).toContain('Não foi possível carregar os candidatos. Tente novamente.');
    const retry = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo');
    retry!.click();
    expect(store.loadList).toHaveBeenCalledTimes(2);
  });

  it('com dados: mostra a tabela', async () => {
    const el = await render(
      fakeStore('loaded', [
        { id: 1, fullName: 'Maria', email: 'maria@example.com', areaOfInterest: null, createdAt: '2026-09-29T12:00:00Z' },
      ]),
    );
    expect(el.querySelector('app-candidate-table')).not.toBeNull();
  });
});
