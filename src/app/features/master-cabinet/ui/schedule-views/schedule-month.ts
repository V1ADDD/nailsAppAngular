import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { fmt } from '@app/shared/format/dates';
import { type MonthCell, keyToDate } from '../../state/schedule-logic';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Month calendar with per-day dots: free / pending / taken. Click opens the day. */
@Component({
  selector: 'app-schedule-month',
  template: `
    <table class="month">
      <caption class="visually-hidden">
        Календарь окон на месяц
      </caption>
      <thead>
        <tr>
          @for (weekday of weekdays; track weekday) {
            <th scope="col">{{ weekday }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (week of weeks(); track week[0]!.key) {
          <tr>
            @for (cell of week; track cell.key) {
              <td>
                <button
                  type="button"
                  class="cell"
                  [class.cell--out]="!cell.inMonth"
                  [class.cell--today]="cell.isToday"
                  [attr.aria-label]="ariaLabel(cell)"
                  (click)="openDay.emit(cell.key)"
                >
                  <span class="cell__day">{{ cell.day }}</span>
                  <span class="cell__dots" aria-hidden="true">
                    @if (cell.taken) {
                      <span class="dot dot--success"></span>
                    }
                    @if (cell.pending) {
                      <span class="dot dot--warning"></span>
                    }
                    @if (cell.free) {
                      <span class="dot"></span>
                    }
                  </span>
                  @if (cell.taken + cell.pending) {
                    <span class="cell__count" aria-hidden="true">{{
                      cell.taken + cell.pending
                    }}</span>
                  }
                </button>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
    <p class="legend">
      <span><span class="dot dot--success"></span> записи</span>
      <span><span class="dot dot--warning"></span> ждут подтверждения</span>
      <span><span class="dot"></span> свободные окна</span>
    </p>
  `,
  styleUrl: './schedule-month.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleMonth {
  readonly weeks = input.required<readonly (readonly MonthCell[])[]>();
  readonly openDay = output<string>();
  protected readonly weekdays = WEEKDAYS;

  protected ariaLabel(cell: MonthCell): string {
    const date = fmt(keyToDate(cell.key), 'd MMMM');
    return `${date}: записей ${cell.taken}, ждут подтверждения ${cell.pending}, свободных ${cell.free}`;
  }
}
