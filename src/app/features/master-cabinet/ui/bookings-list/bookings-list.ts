import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type BookingGroup, type ScheduleRow as Row } from '../../state/schedule-logic';
import { ScheduleRow } from '../schedule-row/schedule-row';

/** «Записи → Список»: bookings grouped by day, a month divider whenever the month changes. */
@Component({
  selector: 'app-bookings-list',
  imports: [ScheduleRow],
  template: `
    @if (groups().length) {
      <div class="list">
        @for (group of groups(); track group.key; let i = $index) {
          @if (i === 0 || groups()[i - 1]!.month !== group.month) {
            <h3 class="list__month">{{ group.month }}</h3>
          }
          <section class="list__day" [attr.aria-label]="group.caption">
            <h4 class="list__caption">{{ group.caption }}</h4>
            <ul class="list__rows">
              @for (row of group.rows; track row.id) {
                <li><app-schedule-row [row]="row" (pick)="pick.emit($event)" /></li>
              }
            </ul>
          </section>
        }
      </div>
    } @else {
      <div class="empty-state">
        @if (past()) {
          <p class="empty-state__title">Прошлых записей пока нет</p>
          <p>Здесь появятся визиты, которые уже прошли.</p>
        } @else {
          <p class="empty-state__title">Предстоящих записей нет</p>
          <p>Клиенты увидят ваши свободные окна и запишутся сами.</p>
        }
      </div>
    }
  `,
  styles: `
    .list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
    }
    .list__month {
      margin-top: var(--space-2);
      font-family: var(--font-family-display);
      letter-spacing: var(--letter-spacing-display);
      font-size: var(--font-size-lg);
      &::first-letter {
        text-transform: uppercase;
      }
    }
    .list__day {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-2);
    }
    .list__caption {
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-bold);
      letter-spacing: var(--letter-spacing-caps);
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .list__rows {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
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
export class BookingsList {
  readonly groups = input.required<readonly BookingGroup[]>();
  readonly past = input(false);
  readonly pick = output<Row>();
}
