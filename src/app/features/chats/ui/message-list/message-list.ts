import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { type BookingView } from '@app/core/data/api';
import { type Chat, type Message, type Role } from '@app/core/data/models';
import { BookingCard } from '../booking-card/booking-card';
import { groupByDay } from '../group-by-day';
import { MessageBubble } from '../message-bubble/message-bubble';
import { DayDivider } from './day-divider';

/** Scrollable message flow grouped by day; keeps itself scrolled to the newest message. */
@Component({
  selector: 'app-message-list',
  imports: [BookingCard, DayDivider, MessageBubble],
  template: `
    <div #scroller class="scroller" role="log" aria-live="polite" aria-relevant="additions" aria-label="Сообщения">
      @for (day of days(); track day.key) {
        <section class="day" [attr.aria-label]="day.label">
          <app-day-divider [label]="day.label" />
          @for (m of day.messages; track m.id) {
            @switch (m.kind) {
              @case ('system') {
                <p class="system">{{ m.text }}</p>
              }
              @case ('booking') {
                @if (m.bookingId && bookings().get(m.bookingId); as booking) {
                  <div class="booking" [class.booking--own]="m.author === role()">
                    <app-booking-card
                      [booking]="booking"
                      [role]="role()"
                      [busy]="busy()"
                      (confirmed)="confirmed.emit($event)"
                      (cancelled)="cancelled.emit($event)"
                    />
                  </div>
                }
              }
              @default {
                <app-message-bubble
                  [message]="m"
                  [own]="m.author === role()"
                  [read]="isRead(m)"
                  (edited)="edited.emit($event)"
                  (removed)="removed.emit($event)"
                  (imageOpened)="imageOpened.emit($event)"
                />
              }
            }
          }
        </section>
      } @empty {
        <p class="empty">Напишите первое сообщение</p>
      }
    </div>
  `,
  styleUrl: './message-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageList {
  readonly messages = input.required<readonly Message[]>();
  readonly bookings = input.required<ReadonlyMap<string, BookingView>>();
  readonly chat = input.required<Chat>();
  readonly role = input.required<Role>();
  readonly busy = input(false);

  readonly confirmed = output<string>();
  readonly cancelled = output<string>();
  readonly edited = output<Message>();
  readonly removed = output<Message>();
  readonly imageOpened = output<string>();

  protected readonly days = computed(() => groupByDay(this.messages()));
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly lastId = computed(() => this.messages().at(-1)?.id);

  constructor() {
    // Scroll to the newest message on open and whenever a new one is appended.
    afterRenderEffect(() => {
      this.lastId();
      const el = this.scroller().nativeElement;
      el.scrollTop = el.scrollHeight;
    });
  }

  protected isRead(message: Message): boolean {
    const other: Role = this.role() === 'client' ? 'master' : 'client';
    return this.chat().readAt[other] >= message.sentAt;
  }
}
