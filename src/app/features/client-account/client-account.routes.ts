import { type Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('./pages/client-account-page/client-account-page').then((m) => m.ClientAccountPage),
  },
] satisfies Routes;
