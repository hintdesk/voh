import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomeComponent),
  },
  {
    path: 'program/:id',
    loadComponent: () =>
      import('./pages/program/program.page').then((m) => m.Program),
  },
  { path: '**', redirectTo: '' },
];
