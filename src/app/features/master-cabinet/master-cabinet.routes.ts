import { type Routes } from '@angular/router';

/** /profile/master: hub + one page per cabinet section, sharing the shell's CabinetStore. */
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
        path: 'schedule',
        title: 'Расписание',
        loadComponent: () =>
          import('./pages/sections/schedule-section').then((m) => m.ScheduleSection),
      },
      {
        path: 'clients',
        title: 'Клиенты',
        loadComponent: () =>
          import('./pages/sections/clients-section').then((m) => m.ClientsSection),
      },
      {
        path: 'stats',
        title: 'Статистика',
        loadComponent: () => import('./pages/sections/stats-section').then((m) => m.StatsSection),
      },
      {
        path: 'services',
        title: 'Услуги и цены',
        loadComponent: () =>
          import('./pages/sections/services-section').then((m) => m.ServicesSection),
      },
      {
        path: 'settings',
        title: 'Рабочий график',
        loadComponent: () =>
          import('./pages/sections/settings-section').then((m) => m.SettingsSection),
      },
      {
        path: 'card',
        title: 'Моя карточка',
        loadComponent: () => import('./pages/sections/card-section').then((m) => m.CardSection),
      },
      {
        path: 'portfolio',
        title: 'Портфолио',
        loadComponent: () =>
          import('./pages/sections/portfolio-section').then((m) => m.PortfolioSection),
      },
      {
        path: 'verification',
        title: 'Верификация',
        loadComponent: () =>
          import('./pages/sections/verification-section').then((m) => m.VerificationSection),
      },
      { path: '**', redirectTo: '' },
    ],
  },
] satisfies Routes;
