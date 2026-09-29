import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CandidatesApiService } from '../../../../core/api/candidates-api.service';
import { CandidateCreatePageComponent } from './candidate-create-page.component';

describe('CandidateCreatePageComponent', () => {
  it('mostra o título, o formulário e o link para a listagem', async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateCreatePageComponent],
      providers: [provideRouter([]), { provide: CandidatesApiService, useValue: { create: vi.fn() } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CandidateCreatePageComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Novo candidato');
    expect(el.querySelector('app-candidate-form')).not.toBeNull();
    const link = el.querySelector<HTMLAnchorElement>('a[href="/candidatos"]');
    expect(link?.textContent?.trim()).toBe('Ver candidatos');
  });
});
