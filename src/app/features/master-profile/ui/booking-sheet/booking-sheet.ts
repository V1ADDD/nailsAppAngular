import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { subcategoryName } from '@app/core/data/catalog';
import { type Master, type MasterService, type Slot } from '@app/core/data/models';
import { PricePipe } from '@app/shared/format/price';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { type BookingWizard } from '../../state/master-profile.store';
import { type DayOption, formatDuration } from '../../state/profile-helpers';
import { BookingSummary } from '../booking-summary/booking-summary';
import { SlotPicker } from '../slot-picker/slot-picker';

/** ТЗ 6.3 booking flow: service → day & time → conflicts & summary → «Забронировать». */
@Component({
  selector: 'app-booking-sheet',
  imports: [BookingSummary, PricePipe, Sheet, SlotPicker],
  templateUrl: './booking-sheet.html',
  styleUrl: './booking-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingSheet {
  readonly master = input.required<Master>();
  readonly wizard = input.required<BookingWizard>();
  readonly days = input.required<readonly DayOption[]>();
  readonly daySlots = input.required<readonly Slot[]>();
  readonly service = input<MasterService | null>(null);
  readonly slot = input<Slot | null>(null);
  readonly releaseAt = input<Date | null>(null);
  readonly canSubmit = input(false);

  readonly closed = output<void>();
  readonly serviceChange = output<string>();
  readonly dayChange = output<string>();
  readonly slotChange = output<string>();
  readonly submitted = output<void>();

  protected readonly serviceName = subcategoryName;
  protected readonly duration = formatDuration;

  protected onOpenChange(open: boolean): void {
    if (!open) this.closed.emit();
  }
}
