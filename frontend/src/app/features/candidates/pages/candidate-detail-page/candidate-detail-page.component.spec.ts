import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Candidate } from '../../../../core/models/candidate.models';
import { CandidatesStore } from '../../data/candidates.store';
import { CandidateDetailPageComponent } from './candidate-detail-page.component';

const candidate: Candidate = {
  id: 7,
  fullName: 'Maria Souza',
  email: 'maria@example.com',
  phone: null,
  areaOfInterest: null,
  professionalSummary: null,
  createdAt: '2026-09-29T12:00:00.000Z',
};

function fakeStore(status: 'loading' | 'loaded' | 'not-found' | 'error', selected: Candidate | null = null) {
  return { detailStatus: signal(status), selected: signal(selected), loadById: vi.fn() };
}

async function render(store: ReturnType<typeof fakeStore>, id = '7') {
  await TestBed.configureTestingModule({
    imports: [CandidateDetailPageComponent],
    providers: [provideRouter([]), { provide: CandidatesStore, useValue: store }],
  }).compileComponents();
  const fixture = TestBed.createComponent(CandidateDetailPageComponent);
  fixture.componentRef.setInput('id', id);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('CandidateDetailPageComponent', () => {
  it('carrega o candidato do id da rota', async () => {
    const store = fakeStore('loading');
    await render(store, '7');
    expect(store.loadById).toHaveBeenCalledWith(7);
  });

  it('not-found: mensagem e botão de voltar', async () => {
    const el = await render(fakeStore('not-found'));
    expect(el.textContent).toContain('Candidato não encontrado. Ele pode não existir ou o link está incorreto.');
    const back = [...el.querySelectorAll('a')].find((a) => a.textContent?.trim() === 'Voltar para a lista');
    expect(back?.getAttribute('href')).toBe('/candidatos');
  });

  it('loaded: mostra os detalhes', async () => {
    const el = await render(fakeStore('loaded', candidate));
    expect(el.querySelector('app-candidate-details')).not.toBeNull();
    expect(el.textContent).toContain('Maria Souza');
  });

  it('error: mensagem de falha', async () => {
    const el = await render(fakeStore('error'));
    expect(el.textContent).toContain('Não foi possível carregar o candidato. Tente novamente.');
  });
});
