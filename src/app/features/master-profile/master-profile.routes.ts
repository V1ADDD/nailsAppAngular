import { type Routes } from '@angular/router';

export default [
  {
    path: ':id',
    loadComponent: () => import('./pages/master-page/master-page').then((m) => m.MasterPage),
  },
] satisfies Routes;
