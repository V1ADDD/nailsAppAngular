import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

/** Chats and the profile need a signed-in user; guests are sent to /login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  if (session.authenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};
