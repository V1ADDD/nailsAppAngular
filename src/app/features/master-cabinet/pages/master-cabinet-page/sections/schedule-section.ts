import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { type ScheduleTemplate } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Swipe } from '@app/shared/ui/swipe';
import { Tabs, type TabOption } from '@app/shared/ui/tabs/tabs';
import { CabinetStore } from '../../../state/cabinet.store';
import {
  type SchedulePeriod,
  type ScheduleRow,
  neighbourPeriod,
  periodCaption,
} from '../../../state/schedule-logic';
import { BookingSheet, type CancelRequest } from '../../../ui/booking-sheet/booking-sheet';
import { CabinetSection } from '../../../ui/cabinet-section/cabinet-section';
import {
  type ExternalRequest,
  FreeSlotSheet,
  type SiteBookingRequest,
} from '../../../ui/free-slot-sheet/free-slot-sheet';
import { ScheduleDay } from '../../../ui/schedule-views/schedule-day';
import { ScheduleMonth } from '../../../ui/schedule-views/schedule-month';
import { ScheduleWeek } from '../../../ui/schedule-views/schedule-week';
import { TEMPLATE_DAYS, TemplateSheet } from '../../../ui/template-sheet/template-sheet';
import { injectCabinetFeedback } from './cabinet-feedback';

export const PERIOD_TABS: readonly TabOption<SchedulePeriod>[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

/** 2. «Расписание» (ТЗ 6.1, 6.2, 6.3, 6.8, 7.1). */
@Component({
  selector: 'app-schedule-section',
  imports: [
    CabinetSection,
    Tabs,
    Icon,
    Swipe,
    ScheduleDay,
    ScheduleWeek,
    ScheduleMonth,
    BookingSheet,
    FreeSlotSheet,
    TemplateSheet,
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

  protected readonly tabs = PERIOD_TABS;
  protected readonly caption = computed(() =>
    periodCaption(this.store.scheduleDate(), this.store.schedulePeriod(), this.store.todayKey()),
  );

  private readonly selectedId = signal<string | null>(null);
  protected readonly bookingOpen = signal(false);
  protected readonly freeOpen = signal(false);
  protected readonly templateOpen = signal(false);

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

  protected swipe(step: number): void {
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
    this.templateOpen.set(false);
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

  // ── Template ─────────────────────────────────────────────────────────────
  protected generate(template: ScheduleTemplate): void {
    this.store.generateSlots(
      template,
      TEMPLATE_DAYS,
      this.feedback.done(`Окна на ${TEMPLATE_DAYS} дней созданы`, this.closeAll),
    );
  }

  protected addSlot(event: { start: string; durationMin: number }): void {
    this.store.addSlot(
      event.start,
      event.durationMin,
      this.feedback.done('Окно добавлено', this.closeAll),
    );
  }
}
