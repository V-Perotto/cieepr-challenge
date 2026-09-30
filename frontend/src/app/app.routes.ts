import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'candidatos' },
  {
    path: 'candidatos',
    title: 'Candidatos',
    loadComponent: () =>
      import('./features/candidates/pages/candidate-list-page/candidate-list-page.component').then(
        (m) => m.CandidateListPageComponent,
      ),
  },
  {
    // Precisa vir antes de 'candidatos/:id'.
    path: 'candidatos/novo',
    title: 'Novo candidato',
    loadComponent: () =>
      import('./features/candidates/pages/candidate-create-page/candidate-create-page.component').then(
        (m) => m.CandidateCreatePageComponent,
      ),
  },
  {
    path: 'candidatos/:id',
    title: 'Detalhes do candidato',
    loadComponent: () =>
      import('./features/candidates/pages/candidate-detail-page/candidate-detail-page.component').then(
        (m) => m.CandidateDetailPageComponent,
      ),
  },
  { path: '**', redirectTo: 'candidatos' },
];
