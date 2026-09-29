import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { subcategoryName } from '@app/core/data/catalog';
import { type Master, type MasterService, type Slot } from '@app/core/data/models';
import { SlotDatePipe, fmt } from '@app/shared/format/dates';
import { PricePipe } from '@app/shared/format/price';
import { Icon } from '@app/shared/ui/icon/icon';
import { type Conflicts } from '../../state/master-profile.store';
import { formatDuration } from '../../state/profile-helpers';

/** Step 3–4 of booking: ТЗ 6.10 conflict warnings, the summary and the ТЗ 6.4 deadline. */
@Component({
  selector: 'app-booking-summary',
  imports: [Icon, PricePipe, SlotDatePipe],
  templateUrl: './booking-summary.html',
  styleUrl: './booking-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingSummary {
  readonly master = input.required<Master>();
  readonly service = input<MasterService | null>(null);
  readonly slot = input<Slot | null>(null);
  readonly conflicts = input<Conflicts | null>(null);
  readonly checking = input(false);
  readonly releaseAt = input<Date | null>(null);

  protected readonly serviceName = subcategoryName;
  protected readonly duration = formatDuration;

  protected time(value: string): string {
    return fmt(value, 'HH:mm');
  }
}
