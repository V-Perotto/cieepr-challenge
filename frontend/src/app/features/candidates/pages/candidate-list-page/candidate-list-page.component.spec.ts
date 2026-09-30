import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { CandidateSummary } from '../../../../core/models/candidate.models';
import { CandidatesStore } from '../../data/candidates.store';
import { CandidateListPageComponent } from './candidate-list-page.component';

const summary = (id: number): CandidateSummary => ({
  id,
  fullName: `Candidato ${id}`,
  email: `c${id}@example.com`,
  areaOfInterest: null,
  createdAt: '2026-09-29T12:00:00Z',
});

function fakeStore(
  status: 'loading' | 'loaded' | 'error',
  items: CandidateSummary[] = [],
  total = items.length,
  page = 1,
  pageSize = 10,
) {
  const listStatus = signal(status);
  const totalSignal = signal(total);
  const pageSizeSignal = signal(pageSize);
  return {
    listStatus,
    items: signal(items),
    total: totalSignal,
    page: signal(page),
    pageSize: pageSizeSignal,
    pageSizes: [10, 20, 50] as const,
    totalPages: computed(() => Math.ceil(totalSignal() / pageSizeSignal())),
    isEmpty: computed(() => listStatus() === 'loaded' && totalSignal() === 0),
    loadList: vi.fn(),
  };
}

async function render(store: ReturnType<typeof fakeStore>, query: { pagina?: string; itens?: string } = {}) {
  await TestBed.configureTestingModule({
    imports: [CandidateListPageComponent],
    providers: [provideRouter([]), { provide: CandidatesStore, useValue: store }],
  }).compileComponents();
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CandidateListPageComponent);
  if (query.pagina !== undefined) fixture.componentRef.setInput('pagina', query.pagina);
  if (query.itens !== undefined) fixture.componentRef.setInput('itens', query.itens);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const page = fixture.componentInstance as unknown as { goTo(page: number): void; changeSize(size: number): void };
  return { el, navigate, page };
}

const text = (el: Element | null) => el?.textContent?.replace(/\s+/g, ' ').trim();

describe('CandidateListPageComponent', () => {
  it('carrega a página 1 com 10 itens ao abrir e tem o botão "Novo candidato"', async () => {
    const store = fakeStore('loading');
    const { el } = await render(store);
    expect(store.loadList).toHaveBeenCalledWith(1, 10);
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Novo candidato');
    expect(link?.getAttribute('href')).toBe('/candidatos/novo');
  });

  it('carrega a página e o tamanho indicados em ?pagina=&itens=', async () => {
    const store = fakeStore('loading');
    await render(store, { pagina: '3', itens: '20' });
    expect(store.loadList).toHaveBeenCalledWith(3, 20);
  });

  it.each(['abc', '0', '-2', '1.5'])('?pagina=%s inválido carrega a página 1', async (pagina) => {
    const store = fakeStore('loading');
    await render(store, { pagina });
    expect(store.loadList).toHaveBeenCalledWith(1, 10);
  });

  it.each(['15', '100', 'abc'])('?itens=%s fora de 10, 20 ou 50 usa 10', async (itens) => {
    const store = fakeStore('loading');
    await render(store, { itens });
    expect(store.loadList).toHaveBeenCalledWith(1, 10);
  });

  it('lista vazia: mensagem e atalho para o primeiro cadastro, sem rodapé', async () => {
    const { el } = await render(fakeStore('loaded', [], 0));
    expect(el.textContent).toContain('Nenhum candidato cadastrado ainda.');
    const link = [...el.querySelectorAll('a')].find(
      (a) => a.textContent?.trim() === 'Cadastrar o primeiro candidato',
    );
    expect(link?.getAttribute('href')).toBe('/candidatos/novo');
    expect(el.querySelector('app-candidate-table')).toBeNull();
    expect(el.querySelector('tui-pagination')).toBeNull();
  });

  it('erro: mensagem e "Tentar de novo" recarrega a página e o tamanho atuais', async () => {
    const store = fakeStore('error', [], 0, 2, 20);
    const { el } = await render(store, { pagina: '2', itens: '20' });
    expect(el.textContent).toContain('Não foi possível carregar os candidatos. Tente novamente.');
    const retry = [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Tentar de novo');
    retry!.click();
    expect(store.loadList).toHaveBeenLastCalledWith(2, 20);
  });

  it('rodapé (padrão "Footer" da Taiga): total, intervalo exibido e paginação', async () => {
    const items = Array.from({ length: 10 }, (_, i) => summary(i + 11));
    const { el } = await render(fakeStore('loaded', items, 25, 2), { pagina: '2' });
    const caption = el.querySelector('caption[tuiCaption]');
    expect(caption).not.toBeNull();
    expect(text(caption!.querySelector('.candidates-footer__total'))).toBe('25 candidatos');
    const sizeButton = caption!.querySelector<HTMLButtonElement>('button[tuiButtonSelect]');
    expect(text(sizeButton)).toBe('Exibindo 11–20');
    expect(sizeButton?.getAttribute('aria-label')).toBe('Itens por página: 10');
    expect(caption!.querySelector('tui-pagination')).not.toBeNull();
    expect(el.querySelector('.page__summary')).toBeNull();
  });

  it('usa o singular com um candidato', async () => {
    const { el } = await render(fakeStore('loaded', [summary(1)], 1));
    expect(text(el.querySelector('.candidates-footer__total'))).toBe('1 candidato');
    expect(text(el.querySelector('button[tuiButtonSelect]'))).toBe('Exibindo 1–1');
  });

  it('trocar de página navega com ?pagina=N, mantendo o tamanho (a página 1 sai da URL)', async () => {
    const items = Array.from({ length: 10 }, (_, i) => summary(i + 1));
    const { navigate, page } = await render(fakeStore('loaded', items, 25, 1));

    page.goTo(3);
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 3 }, queryParamsHandling: 'merge' }),
    );
    page.goTo(1);
    expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { pagina: null } }));
  });

  it('trocar o tamanho mantém visível o primeiro item exibido (10 não aparece na URL)', async () => {
    const items = Array.from({ length: 10 }, (_, i) => summary(i + 21));
    const { navigate, page } = await render(fakeStore('loaded', items, 45, 3), { pagina: '3' });

    page.changeSize(20); // 1º item exibido é o 21º → página 2 de 20 em 20
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 2, itens: 20 } }),
    );
    page.changeSize(10);
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 3, itens: null } }),
    );
  });

  it('página além da última leva à última página, substituindo a URL', async () => {
    const { navigate } = await render(fakeStore('loaded', [], 25, 9), { pagina: '9' });
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { pagina: 3 }, replaceUrl: true }),
    );
  });
});
