import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';
import { fmt, SlotDatePipe } from '@app/shared/format/dates';
import { PricePipe } from '@app/shared/format/price';
import { Icon } from '@app/shared/ui/icon/icon';

type CardState = 'pending' | 'confirmed' | 'cancelled' | 'done';

/** A booking inside the chat (ТЗ 8.2): status, and confirm/cancel for the right side. */
@Component({
  selector: 'app-booking-card',
  imports: [Icon, RouterLink, PricePipe, SlotDatePipe],
  template: `
    @let b = booking();
    <article
      class="card"
      [class]="'card--' + state()"
      [attr.aria-label]="'Запись: ' + b.serviceName"
    >
      <header class="card__head">
        <app-icon name="calendar" [size]="18" />
        <span class="card__kind">Запись</span>
        <span class="dot" [class]="dotClass()" aria-hidden="true"></span>
      </header>
      <h3 class="card__service">{{ b.serviceName }}</h3>
      <p class="card__date">
        <time [attr.datetime]="b.start">{{ b.start | slotDate: true }}</time>
      </p>
      <p class="card__price">{{ b.price | price }}</p>
      <p class="card__status" [class.card__status--ok]="state() === 'confirmed'">
        {{ statusText() }}
      </p>

      @if (expired()) {
        <p class="card__hint">
          Бронь можно восстановить: договоритесь в чате и создайте запись заново.
          @if (role() === 'client') {
            <a
              class="card__link"
              [routerLink]="['/masters', b.masterId]"
              [queryParams]="{ book: 1, service: b.subcategoryId }"
              >Записаться снова</a
            >
          }
        </p>
      }

      @if (canConfirm() || canCancel()) {
        <div class="card__actions">
          @if (canConfirm()) {
            <button
              type="button"
              class="btn btn--success btn--sm"
              [disabled]="busy()"
              (click)="confirmed.emit(b.id)"
            >
              Подтвердить
            </button>
          }
          @if (canCancel()) {
            <button
              type="button"
              class="btn btn--outline-danger btn--sm"
              [disabled]="busy()"
              (click)="cancelled.emit(b.id)"
            >
              Отменить
            </button>
          }
        </div>
      }
    </article>
  `,
  styleUrl: './booking-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCard {
  readonly booking = input.required<BookingView>();
  /** The viewer's active role. */
  readonly role = input.required<Role>();
  readonly busy = input(false);
  /** Injected for tests; defaults to the real clock. */
  readonly now = input<Date>(new Date());

  readonly confirmed = output<string>();
  readonly cancelled = output<string>();

  protected readonly state = computed<CardState>(() => {
    const status = this.booking().status;
    if (status === 'pending' || status === 'confirmed' || status === 'cancelled') return status;
    return 'done';
  });

  protected readonly dotClass = computed(() => {
    switch (this.state()) {
      case 'pending':
        return 'dot--warning';
      case 'confirmed':
        return 'dot--success';
      default:
        return '';
    }
  });

  private readonly upcoming = computed(
    () => new Date(this.booking().start).getTime() > this.now().getTime(),
  );

  /** ТЗ 8.2: the side that did not create the booking confirms it. */
  protected readonly canConfirm = computed(
    () => this.state() === 'pending' && this.booking().createdBy !== this.role(),
  );

  protected readonly canCancel = computed(
    () => (this.state() === 'pending' || this.state() === 'confirmed') && this.upcoming(),
  );

  protected readonly expired = computed(
    () => this.state() === 'cancelled' && !!this.booking().cancellation?.expired,
  );

  protected readonly statusText = computed(() => {
    const b = this.booking();
    switch (b.status) {
      case 'pending':
        if (b.createdBy === this.role() && b.releaseAt) {
          return `Ожидает подтверждения · освободится, если не подтвердить до ${fmt(b.releaseAt, 'd MMM, HH:mm')}`;
        }
        return 'Ожидает подтверждения';
      case 'confirmed':
        return 'Подтверждено';
      case 'cancelled':
        return `Отменено${b.cancellation ? ': ' + b.cancellation.reason : ''}`;
      case 'completed':
        return 'Завершено';
      case 'no-show':
        return 'Неявка';
    }
  });
}
