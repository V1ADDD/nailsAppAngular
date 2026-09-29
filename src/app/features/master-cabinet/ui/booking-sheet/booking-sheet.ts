import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type BookingView } from '@app/core/data/api';
import { PricePipe } from '@app/shared/format/price';
import { RelativeDayPipe, SlotDatePipe } from '@app/shared/format/dates';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { type ScheduleRow } from '../../state/schedule-logic';

export interface CancelRequest {
  bookingId: string;
  reason: string;
  mutual: boolean;
}

/** ТЗ 6.8 «карточка» of a booked / busy slot: client, service, notes and actions. */
@Component({
  selector: 'app-booking-sheet',
  imports: [FormsModule, Sheet, Avatar, PricePipe, SlotDatePipe, RelativeDayPipe],
  templateUrl: './booking-sheet.html',
  styleUrl: './booking-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingSheet {
  readonly open = model(false);
  readonly row = input<ScheduleRow | null>(null);
  readonly saving = input(false);

  readonly confirm = output<string>();
  readonly cancelBooking = output<CancelRequest>();
  readonly noShow = output<string>();
  readonly saveNote = output<{ bookingId: string; note: string }>();
  readonly write = output<BookingView>();

  protected readonly booking = computed(() => this.row()?.booking ?? null);
  protected readonly note = linkedSignal(() => this.booking()?.note ?? '');
  protected readonly cancelling = linkedSignal({ source: this.row, computation: () => false });
  protected readonly reason = linkedSignal({ source: this.row, computation: () => '' });
  protected readonly mutual = linkedSignal({ source: this.row, computation: () => false });
  protected readonly reasonTouched = linkedSignal({ source: this.row, computation: () => false });

  protected readonly canConfirm = computed(() => {
    const b = this.booking();
    return !!b && b.status === 'pending' && b.createdBy === 'client';
  });
  protected readonly awaitingClient = computed(() => {
    const b = this.booking();
    return !!b && b.status === 'pending' && b.createdBy === 'master';
  });
  protected readonly canCancel = computed(() => {
    const b = this.booking();
    return !!b && !this.row()?.past && (b.status === 'pending' || b.status === 'confirmed');
  });
  protected readonly canNoShow = computed(() => {
    const b = this.booking();
    return !!b && !!this.row()?.past && (b.status === 'confirmed' || b.status === 'completed');
  });

  protected submitCancel(): void {
    const b = this.booking();
    this.reasonTouched.set(true);
    if (!b || !this.reason().trim()) return;
    this.cancelBooking.emit({
      bookingId: b.id,
      reason: this.reason().trim(),
      mutual: this.mutual(),
    });
  }
}
