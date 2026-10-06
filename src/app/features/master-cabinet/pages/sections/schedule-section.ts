import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { plural } from '@app/shared/format/plural';
import { Icon } from '@app/shared/ui/icon/icon';
import { upFrom } from '@app/shared/ui/media-query';
import { Swipe } from '@app/shared/ui/swipe';
import { Tabs, type TabOption } from '@app/shared/ui/tabs/tabs';
import { CabinetStore } from '../../state/cabinet.store';
import {
  type SchedulePeriod,
  type ScheduleRow,
  gridBounds,
  neighbourPeriod,
  periodCaption,
} from '../../state/schedule-logic';
import { type ListMode } from '../../state/cabinet.store';

export type ScheduleView = 'list' | SchedulePeriod;

const VIEW_TABS: readonly TabOption<ScheduleView>[] = [
  { value: 'list', label: 'Список' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];
import { BookingSheet, type CancelRequest } from '../../ui/booking-sheet/booking-sheet';
import {
  type ExternalRequest,
  FreeSlotSheet,
  type SiteBookingRequest,
} from '../../ui/free-slot-sheet/free-slot-sheet';
import { AddSlotSheet } from '../../ui/add-slot-sheet/add-slot-sheet';
import { BookingsList } from '../../ui/bookings-list/bookings-list';
import { ScheduleAgenda } from '../../ui/schedule-views/schedule-agenda';
import { ScheduleGrid } from '../../ui/schedule-views/schedule-grid';
import { ScheduleMonth } from '../../ui/schedule-views/schedule-month';
import { ScheduleWeek } from '../../ui/schedule-views/schedule-week';
import { injectCabinetFeedback } from './cabinet-feedback';

export const PERIOD_TABS: readonly TabOption<SchedulePeriod>[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

/**
 * «Записи» (ТЗ 6.1, 6.2, 6.3, 6.8, 7.1): a list of upcoming / past bookings by day, or the
 * calendar — phones get a day agenda / week cards, md+ a time grid like Google Calendar;
 * the month is a calendar everywhere.
 */
@Component({
  selector: 'app-schedule-section',
  imports: [
    Tabs,
    Icon,
    Swipe,
    BookingsList,
    ScheduleAgenda,
    ScheduleGrid,
    ScheduleWeek,
    ScheduleMonth,
    BookingSheet,
    FreeSlotSheet,
    AddSlotSheet,
  ],
  templateUrl: './schedule-section.html',
  styleUrl: './schedule-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleSection {
  protected readonly store = inject(CabinetStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly feedback = injectCabinetFeedback();

  protected readonly tabs = VIEW_TABS;
  protected readonly view = computed<ScheduleView>(() =>
    this.store.scheduleList() ? 'list' : this.store.schedulePeriod(),
  );
  protected readonly listTabs = computed<TabOption<ListMode>[]>(() => [
    { value: 'upcoming', label: 'Предстоящие', count: this.store.upcomingCount() },
    { value: 'past', label: 'Прошлые' },
  ]);
  protected readonly caption = computed(() =>
    periodCaption(this.store.scheduleDate(), this.store.schedulePeriod(), this.store.todayKey()),
  );

  private readonly selectedId = signal<string | null>(null);
  protected readonly bookingOpen = signal(false);
  protected readonly freeOpen = signal(false);
  protected readonly addOpen = signal(false);
  /** md+: time grid instead of the phone agenda. */
  protected readonly wide = upFrom('md');

  private readonly workHours = computed(() => {
    const schedule = this.store.master()?.schedule;
    return { from: schedule?.from ?? '09:00', to: schedule?.to ?? '19:00' };
  });
  protected readonly dayBounds = computed(() =>
    gridBounds([this.store.dayView()], this.workHours()),
  );
  protected readonly weekBounds = computed(() =>
    gridBounds(this.store.weekView(), this.workHours()),
  );

  /** «3 записи · 1 ждёт · 12 свободных окон» for the visible day / week. */
  protected readonly dayStats = computed(() => {
    const period = this.view();
    if (period === 'month' || period === 'list') return null;
    const rows = (period === 'day' ? [this.store.dayView()] : this.store.weekView()).flatMap(
      (d) => d.rows,
    );
    const bookings = rows.filter((r) => r.booking).length;
    const pending = rows.filter((r) => r.status === 'pending').length;
    const free = new Set(rows.filter((r) => r.status === 'free').map((r) => r.start)).size;
    return {
      bookings: plural(bookings, ['запись', 'записи', 'записей']),
      pending: pending ? `ждут ответа: ${pending}` : '',
      free: free ? plural(free, ['свободное окно', 'свободных окна', 'свободных окон']) : '',
    };
  });

  /** Looked up live so the sheet reflects updates (e.g. a saved note). */
  protected readonly selected = computed<ScheduleRow | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    for (const rows of this.store.rowsByDay().values()) {
      const row = rows.find((r) => r.id === id);
      if (row) return row;
    }
    return null;
  });

  protected readonly skeletonRows = [1, 2, 3];

  protected setView(view: ScheduleView): void {
    if (view === 'list') {
      this.store.setScheduleList(true);
      return;
    }
    this.store.setScheduleList(false);
    this.store.setSchedulePeriod(view);
  }

  protected swipe(step: number): void {
    if (this.view() === 'list') {
      if (step > 0) this.setView('day');
      return;
    }
    if (this.view() === 'day' && step < 0) {
      this.setView('list');
      return;
    }
    this.store.setSchedulePeriod(neighbourPeriod(this.store.schedulePeriod(), step));
  }

  protected open(row: ScheduleRow): void {
    this.selectedId.set(row.id);
    if (row.booking) this.bookingOpen.set(true);
    else this.freeOpen.set(true);
  }

  private closeAll = () => {
    this.bookingOpen.set(false);
    this.freeOpen.set(false);
    this.addOpen.set(false);
  };

  // ── Booking actions ──────────────────────────────────────────────────────
  protected confirm(id: string): void {
    this.store.confirmBooking(id, this.feedback.done('Запись подтверждена', this.closeAll));
  }

  protected cancel(request: CancelRequest): void {
    this.store.cancelBooking(request, this.feedback.done('Запись отменена', this.closeAll));
  }

  protected noShow(id: string): void {
    this.store.markNoShow(id, this.feedback.done('Отмечено: клиент не пришёл', this.closeAll));
  }

  protected saveNote(event: { bookingId: string; note: string }): void {
    this.store.updateNote(event.bookingId, event.note, this.feedback.done('Заметка сохранена'));
  }

  protected message(booking: BookingView): void {
    if (!booking.clientId) return;
    this.store.openChat(
      booking.clientId,
      this.feedback.done<string>(undefined, (chatId) => {
        this.session.setRole('master');
        void this.router.navigate(['/chats', chatId]);
      }),
    );
  }

  // ── Free slot actions ────────────────────────────────────────────────────
  protected addExternal(request: ExternalRequest): void {
    this.store.addExternal(
      request,
      this.feedback.done('Запись не с сайта добавлена', this.closeAll),
    );
  }

  protected bookForClient(request: SiteBookingRequest): void {
    this.store.bookForClient(
      request,
      this.feedback.done('Клиент подтвердит запись в чате', this.closeAll),
    );
  }

  protected moveSlot(event: { slotId: string; start: string }): void {
    this.store.moveSlot(
      event.slotId,
      event.start,
      this.feedback.done('Окно сдвинуто', this.closeAll),
    );
  }

  protected removeSlot(slotId: string): void {
    this.store.removeSlot(slotId, this.feedback.done('Окно удалено', this.closeAll));
  }

  // ── Manual slot ──────────────────────────────────────────────────────────
  protected addSlot(event: { start: string; durationMin: number }): void {
    this.store.addSlot(
      event.start,
      event.durationMin,
      this.feedback.done('Окно добавлено', this.closeAll),
    );
  }
}
