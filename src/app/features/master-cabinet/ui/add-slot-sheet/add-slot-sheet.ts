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
import { dayKey } from '@app/shared/format/dates';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { durationLabel, minskIso } from '../../state/schedule-logic';
import { DURATIONS } from '../work-settings-form/work-settings-form';

/** ТЗ 6.1: one extra free slot outside the working schedule. */
@Component({
  selector: 'app-add-slot-sheet',
  imports: [FormsModule, Sheet],
  templateUrl: './add-slot-sheet.html',
  styleUrl: './add-slot-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSlotSheet {
  readonly open = model(false);
  /** Preselected day (the one shown in the schedule). */
  readonly date = input(dayKey(new Date()));
  readonly defaultDuration = input(60);
  readonly saving = input(false);
  readonly addSlot = output<{ start: string; durationMin: number }>();

  protected readonly durations = DURATIONS;
  protected readonly durationLabel = durationLabel;
  protected readonly today = dayKey(new Date());

  protected readonly day = linkedSignal(() =>
    this.date() < this.today ? this.today : this.date(),
  );
  protected readonly time = signal('12:00');
  protected readonly duration = linkedSignal(() => this.defaultDuration());

  protected readonly error = computed(() => {
    if (!this.day() || !this.time()) return 'Укажите дату и время';
    return minskIso(this.day(), this.time()) <= new Date().toISOString()
      ? 'Это время уже прошло'
      : null;
  });

  protected submit(): void {
    if (this.error()) return;
    this.addSlot.emit({
      start: minskIso(this.day(), this.time()),
      durationMin: Number(this.duration()),
    });
  }
}
