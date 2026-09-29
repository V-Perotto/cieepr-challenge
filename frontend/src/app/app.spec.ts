import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renderiza o cabeçalho com link para a listagem', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.app-header__brand');
    expect(brand?.textContent?.trim()).toBe('Cadastro de Candidatos');
    expect(brand?.getAttribute('href')).toBe('/candidatos');
  });

  it('tem uma área principal com router-outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('main router-outlet')).not.toBeNull();
  });
});
