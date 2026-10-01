import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { ClientAccountStore } from '../../state/client-account.store';
import { AccountHeader } from '../../ui/account-header/account-header';
import { AccountNav, type AccountNavItem } from '../../ui/account-nav/account-nav';
import { PanelState } from '../../ui/panel-state/panel-state';

const NAV: readonly AccountNavItem[] = [
  { path: '/profile/client/bookings', label: 'Записи', icon: 'calendar' },
  { path: '/profile/client/favorites', label: 'Избранное', icon: 'heart' },
  { path: '/profile/client/reviews', label: 'Отзывы', icon: 'star' },
  { path: '/profile/client/settings', label: 'Настройки', icon: 'sliders-horizontal' },
];

/**
 * /profile/client — кабинет клиента (ТЗ 7.6): header + section nav around a `<router-outlet>`
 * with the section pages (bookings / favorites / reviews / settings), which share the store.
 */
@Component({
  selector: 'app-client-account-page',
  imports: [AccountHeader, AccountNav, PanelState, RouterOutlet],
  providers: [ClientAccountStore],
  templateUrl: './client-account-page.html',
  styleUrl: './client-account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAccountPage {
  protected readonly session = inject(SessionStore);
  private readonly store = inject(ClientAccountStore);

  protected readonly nav = NAV;

  private readonly clientId = computed(() => this.session.client()?.id ?? null);
  protected readonly sessionFailed = computed(
    () => !this.session.client() && !this.session.loading() && !!this.session.error(),
  );

  constructor() {
    // rxMethods follow the signal: data (re)loads once the session has a client.
    this.store.loadBookings(this.clientId);
    this.store.loadReviews(this.clientId);
    this.store.loadMasters();
  }
}
