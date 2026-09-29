import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type ScheduleDay as Day, type ScheduleRow as Row } from '../../state/schedule-logic';
import { ScheduleRow } from '../schedule-row/schedule-row';

@Component({
  selector: 'app-schedule-day',
  imports: [ScheduleRow],
  template: `
    @if (day().rows.length) {
      <ul class="day" aria-label="Окна и записи за день">
        @for (row of day().rows; track row.id) {
          <li><app-schedule-row [row]="row" (pick)="pick.emit($event)" /></li>
        }
      </ul>
    } @else {
      <div class="empty-state">
        <p class="empty-state__title">На этот день окон нет</p>
        <p>Настройте шаблон графика или добавьте окно вручную.</p>
      </div>
    }
  `,
  styles: `
    .day {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .empty-state {
      padding: var(--space-8) var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleDay {
  readonly day = input.required<Day>();
  readonly pick = output<Row>();
}
