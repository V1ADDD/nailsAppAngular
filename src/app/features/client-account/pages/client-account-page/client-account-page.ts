import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { ClientAccountStore } from '../../state/client-account.store';
import { AccountHeader } from '../../ui/account-header/account-header';
import {
  AccountNav,
  type AccountTab,
  type AccountTabOption,
  accountPanelId,
  accountTabId,
} from '../../ui/account-nav/account-nav';
import { PanelState } from '../../ui/panel-state/panel-state';
import { BookingsPanel, type BookingsSub } from './panels/bookings-panel';
import { FavoritesPanel } from './panels/favorites-panel';
import { ReviewsPanel } from './panels/reviews-panel';
import { SettingsPanel } from './panels/settings-panel';

const TABS: readonly AccountTabOption[] = [
  { value: 'bookings', label: 'Записи', icon: 'calendar' },
  { value: 'favorites', label: 'Избранное', icon: 'heart' },
  { value: 'reviews', label: 'Отзывы', icon: 'star' },
  { value: 'settings', label: 'Настройки', icon: 'sliders-horizontal' },
];

const isTab = (value: string | undefined): value is AccountTab =>
  TABS.some((t) => t.value === value);

/** /profile/client — кабинет клиента (ТЗ 7.6). `?tab=` and `?sub=` keep the open section. */
@Component({
  selector: 'app-client-account-page',
  imports: [
    AccountHeader,
    AccountNav,
    BookingsPanel,
    FavoritesPanel,
    PanelState,
    ReviewsPanel,
    SettingsPanel,
  ],
  providers: [ClientAccountStore],
  templateUrl: './client-account-page.html',
  styleUrl: './client-account-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAccountPage {
  readonly tab = input<string>();
  readonly sub = input<string>();

  protected readonly session = inject(SessionStore);
  private readonly store = inject(ClientAccountStore);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;
  protected readonly tabId = accountTabId;
  protected readonly panelId = accountPanelId;

  protected readonly activeTab = linkedSignal<AccountTab>(() => {
    const tab = this.tab();
    return isTab(tab) ? tab : 'bookings';
  });
  protected readonly activeSub = linkedSignal<BookingsSub>(() =>
    this.sub() === 'past' ? 'past' : 'upcoming',
  );

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

  protected selectTab(tab: AccountTab): void {
    this.activeTab.set(tab);
    this.syncUrl({ tab });
  }

  protected selectSub(sub: BookingsSub): void {
    this.activeSub.set(sub);
    this.syncUrl({ tab: 'bookings', sub });
  }

  private syncUrl(queryParams: { tab: AccountTab; sub?: BookingsSub }): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
