import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type ScheduleRow as Row } from '../../state/schedule-logic';

/** «09:00 · Алина К. · Маникюр · [Подтверждено]» — a colored slot row (ТЗ 6.2). */
@Component({
  selector: 'app-schedule-row',
  imports: [DatePipe],
  template: `
    <button
      type="button"
      class="row"
      [class]="'row--' + row().status"
      [class.row--compact]="compact()"
      (click)="pick.emit(row())"
    >
      <span class="row__time">{{ row().start | date: 'HH:mm' }}</span>
      @if (!compact()) {
        <span class="row__main">
          @if (row().booking; as booking) {
            <span class="row__name">{{ booking.clientName }}</span>
            <span class="row__service">{{ booking.serviceName }}</span>
          } @else {
            <span class="row__name">Свободное окно</span>
            <span class="row__service">{{ row().durationMin }} мин</span>
          }
        </span>
        <span class="row__tag">{{ row().label }}</span>
      } @else {
        <span class="visually-hidden">
          {{ row().booking?.clientName ?? 'Свободное окно' }}, {{ row().label }}
        </span>
      }
    </button>
  `,
  styleUrl: './schedule-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleRow {
  readonly row = input.required<Row>();
  /** Week view: just the time on a colored chip. */
  readonly compact = input(false);
  readonly pick = output<Row>();
}
