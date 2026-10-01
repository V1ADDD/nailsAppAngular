import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { fmt } from '@app/shared/format/dates';
import { plural } from '@app/shared/format/plural';
import { toHhmm, toMinutes } from '@app/core/data/rules';
import {
  type GridBlock,
  type GridBounds,
  type ScheduleDay,
  type ScheduleRow,
  keyToDate,
  layoutGridDay,
} from '../../state/schedule-logic';

/** Blocks shorter than this (minutes) show only the time. */
const TINY = 40;

/**
 * Day / week as a time grid (md+, like Google Calendar): hours down the side, a column
 * per day, bookings as blocks sized by duration, free slots as light dashed blocks.
 */
@Component({
  selector: 'app-schedule-grid',
  imports: [DatePipe],
  templateUrl: './schedule-grid.html',
  styleUrl: './schedule-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleGrid {
  readonly days = input.required<readonly ScheduleDay[]>();
  readonly bounds = input.required<GridBounds>();
  readonly todayKey = input.required<string>();
  /** Fixed «now» for tests; otherwise a clock ticking once a minute. */
  readonly now = input<Date | null>(null);
  readonly pick = output<ScheduleRow>();
  readonly openDay = output<string>();

  protected readonly tiny = TINY;
  private readonly clock = signal(new Date());
  protected readonly columns = computed(() =>
    this.days().map((day) => layoutGridDay(day, this.bounds())),
  );
  protected readonly hours = computed(() => {
    const { from, to } = this.bounds();
    return Array.from({ length: (to - from) / 60 }, (_, i) => toHhmm(from + i * 60));
  });
  /** Minutes from the top for the «now» line, or null when it is off the grid. */
  protected readonly nowTop = computed(() => {
    const now = this.now() ?? this.clock();
    const minutes = toMinutes(fmt(now, 'HH:mm')) - this.bounds().from;
    const span = this.bounds().to - this.bounds().from;
    return minutes >= 0 && minutes <= span ? minutes : null;
  });

  constructor() {
    const timer = setInterval(() => this.clock.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected head(key: string, format: string): string {
    return fmt(keyToDate(key), format);
  }

  protected freeLabel(block: GridBlock): string {
    const places = block.places > 1 ? `, ${plural(block.places, ['место', 'места', 'мест'])}` : '';
    return `Свободное окно ${fmt(block.row.start, 'HH:mm')}${places}`;
  }

  protected bookingLabel(block: GridBlock): string {
    const b = block.row.booking;
    return `${fmt(block.row.start, 'HH:mm')}, ${b?.clientName ?? ''}, ${b?.serviceName ?? ''}, ${block.row.label}`;
  }
}
