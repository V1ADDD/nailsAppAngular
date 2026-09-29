import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type Slot } from '@app/core/data/models';
import { PluralPipe } from '@app/shared/format/plural';
import { fmt, relativeDay } from '@app/shared/format/dates';
import { type DayOption, SLOT_FORMS } from '../../state/profile-helpers';

const STATUS_LABEL: Record<string, string> = {
  busy: 'занято',
  booked: 'занято',
  pending: 'ожидает подтверждения',
};

/** ТЗ 6.2: day chips for two weeks + time grid; clients see free / busy / pending. */
@Component({
  selector: 'app-slot-picker',
  imports: [PluralPipe],
  templateUrl: './slot-picker.html',
  styleUrl: './slot-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotPicker {
  readonly days = input.required<readonly DayOption[]>();
  readonly day = input<string | null>(null);
  readonly slots = input.required<readonly Slot[]>();
  readonly slotId = input<string | null>(null);

  readonly dayChange = output<string>();
  readonly slotChange = output<string>();

  protected readonly slotForms = SLOT_FORMS;

  protected weekday(date: Date): string {
    const label = relativeDay(date);
    return label === 'Сегодня' || label === 'Завтра' ? label : fmt(date, 'EEEEEE');
  }

  protected dayNumber(date: Date): string {
    return fmt(date, 'd MMM');
  }

  protected time(slot: Slot): string {
    return fmt(slot.start, 'HH:mm');
  }

  protected statusLabel(slot: Slot): string | null {
    return STATUS_LABEL[slot.status] ?? null;
  }
}
