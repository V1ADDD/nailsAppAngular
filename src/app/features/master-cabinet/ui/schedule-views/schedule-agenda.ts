import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { fmt } from '@app/shared/format/dates';
import { plural } from '@app/shared/format/plural';
import {
  type AgendaItem,
  type FreeChip,
  type ScheduleRow as Row,
  buildAgenda,
} from '../../state/schedule-logic';
import { ScheduleRow } from '../schedule-row/schedule-row';

/** Collapsed free ranges show this many time chips before «ещё N». */
export const COLLAPSED_CHIPS = 8;

/**
 * Day view on phones: bookings as rows, free time between them as one «Свободно
 * 10:00–13:00» card with time chips, so a 15-minute grid stays a short list.
 */
@Component({
  selector: 'app-schedule-agenda',
  imports: [DatePipe, ScheduleRow],
  template: `
    @if (items().length) {
      <ol class="agenda" aria-label="Записи и свободное время за день">
        @for (item of items(); track item.id) {
          @if (item.kind === 'booking') {
            <li><app-schedule-row [row]="item.row" (pick)="pick.emit($event)" /></li>
          } @else {
            <li class="free">
              <p class="free__head">
                <span class="free__range">
                  Свободно {{ item.start | date: 'HH:mm' }}–{{ item.end | date: 'HH:mm' }}
                </span>
                <span class="free__count">{{ count(item.chips) }}</span>
              </p>
              <ul class="free__chips">
                @for (chip of visible(item); track chip.row.id) {
                  <li>
                    <button
                      type="button"
                      class="free__chip"
                      [attr.aria-label]="chipLabel(chip)"
                      (click)="pick.emit(chip.row)"
                    >
                      {{ chip.row.start | date: 'HH:mm' }}
                      @if (chip.places > 1) {
                        <span class="free__places" aria-hidden="true">×{{ chip.places }}</span>
                      }
                    </button>
                  </li>
                }
                @if (hidden(item); as more) {
                  <li>
                    <button
                      type="button"
                      class="free__chip free__chip--more"
                      [attr.aria-label]="'Показать ещё ' + plural(more, words)"
                      (click)="expand(item.id)"
                    >
                      ещё {{ more }}
                    </button>
                  </li>
                }
              </ul>
            </li>
          }
        }
      </ol>
    } @else {
      <div class="empty-state">
        <p class="empty-state__title">На этот день окон нет</p>
        <p>Настройте рабочий график или добавьте окно вручную.</p>
      </div>
    }
  `,
  styleUrl: './schedule-agenda.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleAgenda {
  readonly rows = input.required<readonly Row[]>();
  readonly pick = output<Row>();

  protected readonly items = computed(() => buildAgenda(this.rows()));
  protected readonly plural = plural;
  protected readonly words = ['окно', 'окна', 'окон'] as const;
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected visible(item: Extract<AgendaItem, { kind: 'free' }>): FreeChip[] {
    return this.expanded().has(item.id) ? item.chips : item.chips.slice(0, COLLAPSED_CHIPS);
  }

  protected hidden(item: Extract<AgendaItem, { kind: 'free' }>): number {
    return this.expanded().has(item.id) ? 0 : Math.max(0, item.chips.length - COLLAPSED_CHIPS);
  }

  protected expand(id: string): void {
    this.expanded.update((set) => new Set(set).add(id));
  }

  protected count(chips: readonly FreeChip[]): string {
    return plural(chips.length, this.words);
  }

  protected chipLabel(chip: FreeChip): string {
    const places = chip.places > 1 ? `, ${plural(chip.places, ['место', 'места', 'мест'])}` : '';
    return `Свободное окно ${fmt(chip.row.start, 'HH:mm')}${places}`;
  }
}
