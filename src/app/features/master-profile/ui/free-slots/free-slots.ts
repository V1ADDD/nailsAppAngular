import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RelativeDayPipe, fmt } from '@app/shared/format/dates';
import { type SlotDay } from '../../state/profile-helpers';
import { ProfileSection } from '../profile-section/profile-section';

/** «Ближайшие свободные окна»: next free slots grouped by day; a tap starts booking. */
@Component({
  selector: 'app-free-slots',
  imports: [ProfileSection, RelativeDayPipe],
  template: `
    <app-profile-section heading="Ближайшие свободные окна" icon="calendar">
      @if (loading()) {
        <div class="skeleton skeleton--row" aria-label="Загрузка расписания"></div>
      } @else if (days().length === 0) {
        <p class="empty">Свободных окон пока нет. Напишите мастеру — возможно, он найдёт время.</p>
      } @else {
        @for (day of days(); track day.key) {
          <div class="day">
            <h3 class="section-caption">{{ day.date | relativeDay }}</h3>
            <div class="slots">
              @for (slot of day.slots; track slot.id) {
                <button
                  type="button"
                  class="chip"
                  [disabled]="!bookable()"
                  [attr.aria-label]="
                    'Записаться: ' + (day.date | relativeDay) + ', ' + time(slot.start)
                  "
                  (click)="pick.emit(slot.id)"
                >
                  {{ time(slot.start) }}
                </button>
              }
            </div>
          </div>
        }
        @if (bookable()) {
          <button type="button" class="btn btn--outline btn--block" (click)="more.emit()">
            Всё расписание
          </button>
        }
      }
    </app-profile-section>
  `,
  styles: `
    :host {
      display: block;
    }
    .empty {
      color: var(--color-text-secondary);
    }
    .skeleton--row {
      height: 5rem;
    }
    .day {
      display: grid;
      gap: var(--space-2);
    }
    .slots {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .chip {
      min-width: 4.5rem;
      justify-content: center;
      &:hover:not(:disabled) {
        color: var(--color-primary);
        border-color: var(--color-primary);
      }
      &:disabled {
        cursor: default;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeSlots {
  readonly days = input.required<readonly SlotDay[]>();
  readonly loading = input(false);
  /** False on the master's own profile: slots are shown but not bookable. */
  readonly bookable = input(true);
  readonly pick = output<string>();
  readonly more = output<void>();

  protected time(start: string): string {
    return fmt(start, 'HH:mm');
  }
}
