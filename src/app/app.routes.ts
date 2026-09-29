import { type Routes } from '@angular/router';
import { authGuard } from './core/session/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'Мастера рядом — карта бьюти-мастеров',
    loadChildren: () => import('./features/search/search.routes'),
  },
  {
    path: 'masters',
    loadChildren: () => import('./features/master-profile/master-profile.routes'),
  },
  {
    path: 'chats',
    title: 'Чаты',
    canActivate: [authGuard],
    loadChildren: () => import('./features/chats/chats.routes'),
  },
  {
    path: 'profile',
    title: 'Профиль',
    canActivate: [authGuard],
    loadChildren: () => import('./features/profile/profile.routes'),
  },
  {
    path: 'login',
    title: 'Вход',
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: '**',
    title: 'Страница не найдена',
    loadComponent: () => import('./core/layout/not-found-page').then((m) => m.NotFoundPage),
  },
];
