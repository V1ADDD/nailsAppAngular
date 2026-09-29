import { type Routes } from '@angular/router';
import { ProfileShell } from './profile-shell';

export default [
  {
    path: '',
    component: ProfileShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'client' },
      { path: 'client', loadChildren: () => import('../client-account/client-account.routes') },
      { path: 'master', loadChildren: () => import('../master-cabinet/master-cabinet.routes') },
    ],
  },
] satisfies Routes;
