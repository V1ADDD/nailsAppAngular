import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { type BookingView } from '@app/core/data/api';
import { SlotDatePipe } from '@app/shared/format/dates';
import { Icon } from '@app/shared/ui/icon/icon';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export type CancelMode = 'cancel' | 'reschedule';

export interface CancelDecision {
  reason: string;
  mutual: boolean;
}

const OTHER = 'other';
export const RESCHEDULE_REASON = 'Перенос на другое время';
const PRESETS: Record<CancelMode, readonly string[]> = {
  cancel: ['Изменились планы', 'Плохое самочувствие', 'Не успеваю к этому времени'],
  reschedule: [RESCHEDULE_REASON],
};

let nextId = 0;

/**
 * ТЗ 6.5 cancellation (reason required, «по договорённости» has no consequences) and
 * ТЗ 6.6 reschedule, which in the MVP is a cancellation followed by a new booking.
 */
@Component({
  selector: 'app-cancel-booking-sheet',
  imports: [Icon, Sheet, SlotDatePipe],
  templateUrl: './cancel-booking-sheet.html',
  styleUrl: './cancel-booking-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelBookingSheet {
  readonly open = model(false);
  readonly booking = input<BookingView | null>(null);
  readonly mode = input<CancelMode>('cancel');
  readonly busy = input(false);
  readonly submitted = output<CancelDecision>();

  protected readonly formId = `cancel-form-${nextId++}`;
  protected readonly other = OTHER;
  protected readonly presets = computed(() => PRESETS[this.mode()]);

  /** Form state resets whenever the sheet opens for a booking. */
  private readonly resetKey = computed(() => ({
    open: this.open(),
    id: this.booking()?.id,
    mode: this.mode(),
  }));
  protected readonly choice = linkedSignal({
    source: this.resetKey,
    computation: ({ mode }): string => (mode === 'reschedule' ? RESCHEDULE_REASON : ''),
  });
  protected readonly otherText = linkedSignal({ source: this.resetKey, computation: () => '' });
  protected readonly mutual = linkedSignal({
    source: this.resetKey,
    computation: ({ mode }) => mode === 'reschedule',
  });

  protected readonly reason = computed(() =>
    this.choice() === OTHER ? this.otherText().trim() : this.choice(),
  );

  protected readonly title = computed(() =>
    this.mode() === 'cancel' ? 'Отмена записи' : 'Перенос записи',
  );

  protected onText(event: Event): void {
    this.otherText.set((event.target as HTMLTextAreaElement).value);
  }

  protected onMutual(event: Event): void {
    this.mutual.set((event.target as HTMLInputElement).checked);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.reason() || this.busy()) return;
    this.submitted.emit({ reason: this.reason(), mutual: this.mutual() });
  }
}
