import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type ScheduleTemplate, type TimeRange } from '@app/core/data/models';
import { MAX_CAPACITY, templateError, templateTimes } from '@app/core/data/rules';
import { plural } from '@app/shared/format/plural';
import { Icon } from '@app/shared/ui/icon/icon';
import { durationLabel } from '../../state/schedule-logic';

const WEEKDAYS = [
  { value: 1, short: 'Пн', full: 'Понедельник' },
  { value: 2, short: 'Вт', full: 'Вторник' },
  { value: 3, short: 'Ср', full: 'Среда' },
  { value: 4, short: 'Чт', full: 'Четверг' },
  { value: 5, short: 'Пт', full: 'Пятница' },
  { value: 6, short: 'Сб', full: 'Суббота' },
  { value: 7, short: 'Вс', full: 'Воскресенье' },
];

export const DURATIONS = [15, 30, 45, 60, 90, 120, 150, 180] as const;

const PREVIEW_TIMES = 12;

/**
 * «Рабочий график»: working days, hours, breaks, procedure length and how many clients
 * at once. Shows the resulting day of slots before saving.
 */
@Component({
  selector: 'app-work-settings-form',
  imports: [FormsModule, Icon],
  templateUrl: './work-settings-form.html',
  styleUrl: './work-settings-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkSettingsForm {
  readonly template = input.required<ScheduleTemplate>();
  readonly saving = input(false);
  /** Days ahead the slots are regenerated for (shown in the button). */
  readonly days = input(14);
  readonly save = output<ScheduleTemplate>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly durations = DURATIONS;
  protected readonly maxCapacity = MAX_CAPACITY;
  protected readonly durationLabel = durationLabel;

  protected readonly workDays = linkedSignal<readonly number[]>(() => this.template().workDays);
  protected readonly from = linkedSignal(() => this.template().from);
  protected readonly to = linkedSignal(() => this.template().to);
  protected readonly slotMinutes = linkedSignal(() => this.template().slotMinutes);
  protected readonly breaks = linkedSignal<readonly TimeRange[]>(() => this.template().breaks);
  protected readonly capacity = linkedSignal(() => this.template().capacity);

  private readonly draft = computed<ScheduleTemplate>(() => ({
    workDays: this.workDays(),
    from: this.from(),
    to: this.to(),
    slotMinutes: Number(this.slotMinutes()),
    breaks: this.breaks(),
    capacity: this.capacity(),
  }));

  protected readonly error = computed(() => templateError(this.draft()));
  private readonly times = computed(() => (this.error() ? [] : templateTimes(this.draft())));
  protected readonly previewTimes = computed(() => this.times().slice(0, PREVIEW_TIMES));
  protected readonly moreTimes = computed(() => this.times().length - PREVIEW_TIMES);
  protected readonly summary = computed(() => {
    const slots = this.times().length;
    const text = plural(slots, ['окно', 'окна', 'окон']);
    const places = plural(this.capacity(), ['место', 'места', 'мест']);
    return this.capacity() > 1 ? `${text} в день × ${places}` : `${text} в день`;
  });

  protected toggleDay(day: number): void {
    this.workDays.update((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
    );
  }

  protected addBreak(): void {
    const last = this.breaks().at(-1);
    const from = last ? last.to : '13:00';
    const [h, m] = from.split(':').map(Number) as [number, number];
    const to = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.breaks.update((list) => [...list, { from, to }]);
  }

  protected updateBreak(index: number, patch: Partial<TimeRange>): void {
    this.breaks.update((list) => list.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  protected removeBreak(index: number): void {
    this.breaks.update((list) => list.filter((_, i) => i !== index));
  }

  protected stepCapacity(step: number): void {
    this.capacity.update((c) => Math.max(1, Math.min(MAX_CAPACITY, c + step)));
  }

  protected submit(): void {
    if (this.error()) return;
    this.save.emit(this.draft());
  }
}
