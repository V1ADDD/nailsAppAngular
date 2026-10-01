import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { fmt } from '@app/shared/format/dates';
import { plural } from '@app/shared/format/plural';
import {
  type ScheduleDay as Day,
  type ScheduleRow as Row,
  keyToDate,
} from '../../state/schedule-logic';
import { ScheduleRow } from '../schedule-row/schedule-row';

/**
 * Week on phones: a card per day with its bookings; free time is a single «N свободных
 * окон» button that opens the day instead of listing every slot.
 */
@Component({
  selector: 'app-schedule-week',
  imports: [ScheduleRow],
  template: `
    <ol class="week">
      @for (day of summary(); track day.key) {
        <li class="week__day" [class.week__day--today]="day.key === todayKey()">
          <div class="week__head">
            <span class="week__date">
              <span class="week__weekday">{{ label(day.key, 'EEEEEE') }}</span>
              {{ label(day.key, 'd MMMM') }}
            </span>
            @if (day.free) {
              <button type="button" class="week__free" (click)="openDay.emit(day.key)">
                {{ day.free }}
              </button>
            } @else if (!day.bookings.length) {
              <span class="week__none">Выходной или нет окон</span>
            }
          </div>
          @if (day.bookings.length) {
            <ul class="week__list">
              @for (row of day.bookings; track row.id) {
                <li><app-schedule-row [row]="row" (pick)="pick.emit($event)" /></li>
              }
            </ul>
          }
        </li>
      }
    </ol>
  `,
  styleUrl: './schedule-week.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleWeek {
  readonly days = input.required<readonly Day[]>();
  readonly todayKey = input.required<string>();
  readonly pick = output<Row>();
  readonly openDay = output<string>();

  protected readonly summary = computed(() =>
    this.days().map((day) => {
      const free = new Set(day.rows.filter((r) => r.status === 'free').map((r) => r.start)).size;
      return {
        key: day.key,
        bookings: day.rows.filter((r) => r.status !== 'free'),
        free: free ? plural(free, ['свободное окно', 'свободных окна', 'свободных окон']) : '',
      };
    }),
  );

  protected label(key: string, format: string): string {
    return fmt(keyToDate(key), format);
  }
}
