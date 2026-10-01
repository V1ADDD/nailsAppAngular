import { inject } from '@angular/core';
import { type RedirectFunction, Router, type Routes } from '@angular/router';

export const ACCOUNT_SECTIONS = ['bookings', 'favorites', 'reviews', 'settings'] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

const isSection = (value: unknown): value is AccountSection =>
  ACCOUNT_SECTIONS.includes(value as AccountSection);

/**
 * /profile/client → /profile/client/bookings. Old `?tab=x` links land on that section
 * (other query params such as `?sub=past` are kept).
 */
export const sectionRedirect: RedirectFunction = ({ queryParams }) => {
  const { tab, ...rest } = queryParams;
  const section = isSection(tab) ? tab : 'bookings';
  return inject(Router).createUrlTree(['/profile/client', section], { queryParams: rest });
};

export default [
  {
    path: '',
    loadComponent: () =>
      import('./pages/client-account-page/client-account-page').then((m) => m.ClientAccountPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: sectionRedirect },
      {
        path: 'bookings',
        title: 'Мои записи',
        loadComponent: () =>
          import('./pages/client-account-page/panels/bookings-panel').then((m) => m.BookingsPanel),
      },
      {
        path: 'favorites',
        title: 'Избранное',
        loadComponent: () =>
          import('./pages/client-account-page/panels/favorites-panel').then(
            (m) => m.FavoritesPanel,
          ),
      },
      {
        path: 'reviews',
        title: 'Отзывы',
        loadComponent: () =>
          import('./pages/client-account-page/panels/reviews-panel').then((m) => m.ReviewsPanel),
      },
      {
        path: 'settings',
        title: 'Настройки',
        loadComponent: () =>
          import('./pages/client-account-page/panels/settings-panel').then((m) => m.SettingsPanel),
      },
    ],
  },
] satisfies Routes;
