import { type Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('./pages/master-cabinet-page/master-cabinet-page').then((m) => m.MasterCabinetPage),
  },
] satisfies Routes;
