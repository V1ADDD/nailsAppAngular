import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { SlotDatePipe, fmt } from '@app/shared/format/dates';
import { PricePipe } from '@app/shared/format/price';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { bookAgainUrl, needsClientConfirmation } from '../../state/partition-bookings';

interface StatusView {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'muted';
}

/** Booking in the client's list (ТЗ 7.6): master, service, time, price, status, actions. */
@Component({
  selector: 'app-booking-card',
  imports: [Avatar, Icon, PricePipe, RouterLink, SlotDatePipe],
  templateUrl: './booking-card.html',
  styleUrl: './booking-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCard {
  readonly booking = input.required<BookingView>();
  /** Past bookings are read-only: no reschedule / cancel. */
  readonly past = input(false);
  readonly busy = input(false);

  readonly reschedule = output<void>();
  readonly cancelBooking = output<void>();
  readonly confirm = output<void>();
  readonly chat = output<void>();

  protected readonly needsConfirmation = computed(() => needsClientConfirmation(this.booking()));
  protected readonly bookAgain = computed(() => {
    const [path, query] = bookAgainUrl(this.booking()).split('?');
    return { path, query: Object.fromEntries(new URLSearchParams(query)) };
  });

  protected readonly status = computed<StatusView>(() => {
    const b = this.booking();
    switch (b.status) {
      case 'pending':
        if (this.past()) return { label: 'Не подтверждена', tone: 'muted' };
        return this.needsConfirmation()
          ? { label: 'Ждёт вашего подтверждения', tone: 'warning' }
          : { label: 'Ожидает подтверждения', tone: 'warning' };
      case 'confirmed':
        return this.past()
          ? { label: 'Прошла', tone: 'muted' }
          : { label: 'Подтверждено', tone: 'success' };
      case 'completed':
        return { label: 'Завершено', tone: 'success' };
      case 'no-show':
        return { label: 'Неявка', tone: 'danger' };
      case 'cancelled':
        return { label: 'Отменено', tone: 'danger' };
    }
  });

  /** ТЗ 6.4: pending bookings release the slot unless confirmed by the deadline. */
  protected readonly deadline = computed(() => {
    const b = this.booking();
    if (this.past() || b.status !== 'pending' || !b.releaseAt) return '';
    const at = fmt(b.releaseAt, 'd MMM, HH:mm');
    return this.needsConfirmation() ? `Подтвердите до ${at}` : `Мастер подтвердит до ${at}`;
  });

  protected readonly cancellation = computed(() => {
    const c = this.booking().cancellation;
    if (!c) return '';
    const who = c.by === 'client' ? 'Вы отменили' : 'Мастер отменил';
    const mutual = c.mutual ? ' по договорённости' : '';
    return `${who}${mutual}. Причина: ${c.reason}`;
  });
}
