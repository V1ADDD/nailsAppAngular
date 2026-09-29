import { type Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/search-page/search-page').then((m) => m.SearchPage),
  },
] satisfies Routes;
