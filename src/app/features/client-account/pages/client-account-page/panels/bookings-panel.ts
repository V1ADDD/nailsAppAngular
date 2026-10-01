import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Tabs, type TabOption } from '@app/shared/ui/tabs/tabs';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { ClientAccountStore } from '../../../state/client-account.store';
import { BookingCard } from '../../../ui/booking-card/booking-card';
import {
  type CancelDecision,
  type CancelMode,
  CancelBookingSheet,
} from '../../../ui/cancel-booking-sheet/cancel-booking-sheet';
import { PanelState } from '../../../ui/panel-state/panel-state';

export type BookingsSub = 'upcoming' | 'past';

/**
 * /profile/client/bookings — «Записи»: upcoming / past bookings with confirm, chat, cancel and
 * reschedule (ТЗ 6.4–6.6). `?sub=past|upcoming` keeps the open sub-tab.
 */
@Component({
  selector: 'app-bookings-panel',
  imports: [BookingCard, CancelBookingSheet, Icon, PanelState, RouterLink, Tabs],
  templateUrl: './bookings-panel.html',
  styleUrl: './bookings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsPanel {
  /** `?sub=` query param (router input binding). */
  readonly sub = input<string>();

  protected readonly store = inject(ClientAccountStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly subTabs = computed<TabOption<BookingsSub>[]>(() => [
    { value: 'upcoming', label: 'Предстоящие' },
    { value: 'past', label: 'Прошлые' },
  ]);
  protected readonly activeSub = linkedSignal<BookingsSub>(() =>
    this.sub() === 'past' ? 'past' : 'upcoming',
  );
  protected readonly list = computed(() =>
    this.activeSub() === 'past' ? this.store.past() : this.store.upcoming(),
  );

  protected readonly selected = signal<BookingView | null>(null);
  protected readonly mode = signal<CancelMode>('cancel');
  protected readonly sheetOpen = signal(false);

  protected selectSub(sub: BookingsSub): void {
    this.activeSub.set(sub);
    void this.router.navigate([], {
      queryParams: { sub },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected retry(): void {
    this.store.loadBookings(this.session.client()?.id ?? null);
  }

  protected openSheet(booking: BookingView, mode: CancelMode): void {
    this.selected.set(booking);
    this.mode.set(mode);
    this.sheetOpen.set(true);
  }

  protected async decide({ reason, mutual }: CancelDecision): Promise<void> {
    const booking = this.selected();
    if (!booking) return;
    if (this.mode() === 'reschedule') {
      const url = await this.store.reschedule(booking, reason, mutual);
      if (!url) return this.fail();
      this.sheetOpen.set(false);
      this.toast.success('Запись отменена — выберите новое время');
      void this.router.navigateByUrl(url);
      return;
    }
    if (!(await this.store.cancel(booking.id, reason, mutual))) return this.fail();
    this.sheetOpen.set(false);
    this.toast.success('Запись отменена');
  }

  protected async confirm(booking: BookingView): Promise<void> {
    if (await this.store.confirm(booking.id)) this.toast.success('Запись подтверждена');
    else this.fail();
  }

  protected async message(booking: BookingView): Promise<void> {
    const chatId = await this.store.chatFor(booking);
    if (chatId) void this.router.navigate(['/chats', chatId]);
    else this.fail();
  }

  private fail(): void {
    this.toast.error(this.store.actionError() ?? 'Не получилось, попробуйте ещё раз');
  }
}
