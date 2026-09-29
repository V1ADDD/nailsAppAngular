import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type ScheduleTemplate } from '@app/core/data/models';
import { dayKey } from '@app/shared/format/dates';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { minskIso } from '../../state/schedule-logic';

const WEEKDAYS = [
  { value: 1, short: 'Пн', full: 'Понедельник' },
  { value: 2, short: 'Вт', full: 'Вторник' },
  { value: 3, short: 'Ср', full: 'Среда' },
  { value: 4, short: 'Чт', full: 'Четверг' },
  { value: 5, short: 'Пт', full: 'Пятница' },
  { value: 6, short: 'Сб', full: 'Суббота' },
  { value: 7, short: 'Вс', full: 'Воскресенье' },
];

export const SLOT_LENGTHS = [30, 60, 90, 120] as const;
export const TEMPLATE_DAYS = 14;

/** ТЗ 6.1: working days + hours + slot length → free slots for 14 days; manual slot. */
@Component({
  selector: 'app-template-sheet',
  imports: [FormsModule, Sheet],
  templateUrl: './template-sheet.html',
  styleUrl: './template-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateSheet {
  readonly open = model(false);
  readonly template = input.required<ScheduleTemplate>();
  readonly saving = input(false);

  readonly generate = output<ScheduleTemplate>();
  readonly addSlot = output<{ start: string; durationMin: number }>();

  protected readonly weekdays = WEEKDAYS;
  protected readonly slotLengths = SLOT_LENGTHS;
  protected readonly days = TEMPLATE_DAYS;
  protected readonly today = dayKey(new Date());

  protected readonly workDays = linkedSignal<readonly number[]>(() => this.template().workDays);
  protected readonly from = linkedSignal(() => this.template().from);
  protected readonly to = linkedSignal(() => this.template().to);
  protected readonly slotMinutes = linkedSignal(() => this.template().slotMinutes);

  protected readonly manualDate = signal(this.today);
  protected readonly manualTime = signal('12:00');
  protected readonly manualDuration = linkedSignal(() => this.template().slotMinutes);

  protected readonly templateError = computed(() => {
    if (!this.workDays().length) return 'Выберите хотя бы один рабочий день';
    if (!this.from() || !this.to() || this.from() >= this.to()) {
      return 'Время окончания должно быть позже начала';
    }
    return null;
  });

  protected toggleDay(day: number): void {
    this.workDays.update((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b),
    );
  }

  protected submitTemplate(): void {
    if (this.templateError()) return;
    this.generate.emit({
      workDays: this.workDays(),
      from: this.from(),
      to: this.to(),
      slotMinutes: Number(this.slotMinutes()),
    });
  }

  protected submitManual(): void {
    if (!this.manualDate() || !this.manualTime()) return;
    this.addSlot.emit({
      start: minskIso(this.manualDate(), this.manualTime()),
      durationMin: Number(this.manualDuration()),
    });
  }
}
