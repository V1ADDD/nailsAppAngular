import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { fmt } from '@app/shared/format/dates';
import {
  type ScheduleDay as Day,
  type ScheduleRow as Row,
  keyToDate,
} from '../../state/schedule-logic';
import { ScheduleRow } from '../schedule-row/schedule-row';

/** Week view: 7 day rows (mobile) / columns (md+) with compact slot chips. */
@Component({
  selector: 'app-schedule-week',
  imports: [ScheduleRow],
  template: `
    <ol class="week">
      @for (day of days(); track day.key) {
        <li class="week__day" [class.week__day--today]="day.key === todayKey()">
          <button type="button" class="week__head" (click)="openDay.emit(day.key)">
            <span class="week__weekday">{{ label(day.key, 'EEEEEE') }}</span>
            <span class="week__date">{{ label(day.key, 'd MMM') }}</span>
          </button>
          @if (day.rows.length) {
            <ul class="week__slots">
              @for (row of day.rows; track row.id) {
                <li>
                  <app-schedule-row [row]="row" [compact]="true" (pick)="pick.emit($event)" />
                </li>
              }
            </ul>
          } @else {
            <span class="week__none">Нет окон</span>
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

  protected label(key: string, format: string): string {
    return fmt(keyToDate(key), format);
  }
}
