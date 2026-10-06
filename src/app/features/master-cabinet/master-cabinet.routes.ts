import { inject } from '@angular/core';
import { Router, type Routes } from '@angular/router';

/** Old one-page-per-block path → its section tab (string redirects drop query params). */
const toTab = (section: string, tab: string) => () =>
  inject(Router).createUrlTree(['/profile/master', section], { queryParams: { tab } });

/**
 * /profile/master: hub + five sections sharing the shell's CabinetStore. Tabs inside a
 * section are `?tab=`; the old one-page-per-block paths redirect to their tab.
 */
export default [
  {
    path: '',
    loadComponent: () => import('./pages/cabinet-shell/cabinet-shell').then((m) => m.CabinetShell),
    children: [
      {
        path: '',
        title: 'Кабинет мастера',
        loadComponent: () => import('./pages/cabinet-hub/cabinet-hub').then((m) => m.CabinetHub),
      },
      {
        path: 'profile',
        title: 'Профиль мастера',
        loadComponent: () => import('./pages/profile-page').then((m) => m.ProfilePage),
      },
      {
        path: 'bookings',
        title: 'Записи',
        loadComponent: () => import('./pages/bookings-page').then((m) => m.BookingsPage),
      },
      {
        path: 'schedule',
        title: 'График',
        loadComponent: () => import('./pages/work-page').then((m) => m.WorkPage),
      },
      {
        path: 'income',
        title: 'Доходы',
        loadComponent: () => import('./pages/income-page').then((m) => m.IncomePage),
      },
      {
        path: 'settings',
        title: 'Настройки',
        loadComponent: () =>
          import('./pages/cabinet-settings-page/cabinet-settings-page').then(
            (m) => m.CabinetSettingsPage,
          ),
      },
      { path: 'card', redirectTo: 'profile' },
      { path: 'services', redirectTo: toTab('profile', 'services') },
      { path: 'portfolio', redirectTo: toTab('profile', 'portfolio') },
      { path: 'verification', redirectTo: 'profile' },
      { path: 'clients', redirectTo: toTab('bookings', 'clients') },
      { path: 'stats', redirectTo: 'income' },
      { path: '**', redirectTo: '' },
    ],
  },
] satisfies Routes;
