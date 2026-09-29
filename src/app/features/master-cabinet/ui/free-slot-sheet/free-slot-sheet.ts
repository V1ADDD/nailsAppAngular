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
import { type CabinetClient } from '@app/core/data/api';
import { subcategoryName } from '@app/core/data/catalog';
import { type MasterService } from '@app/core/data/models';
import { RelativeDayPipe, SlotDatePipe, dayKey, fmt } from '@app/shared/format/dates';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { Tabs, type TabOption } from '@app/shared/ui/tabs/tabs';
import { type ScheduleRow, minskIso } from '../../state/schedule-logic';

type Mode = 'external' | 'site' | 'slot';

const MODES: readonly TabOption<Mode>[] = [
  { value: 'external', label: 'Не с сайта' },
  { value: 'site', label: 'Через сайт' },
  { value: 'slot', label: 'Окно' },
];

export interface ExternalRequest {
  start: string;
  subcategoryId: string;
  clientName: string;
  note?: string;
}

export interface SiteBookingRequest {
  clientId: string;
  slotId: string;
  subcategoryId: string;
}

/** Free slot actions: external booking (ТЗ 6.8), booking for a client (6.3), move / delete (6.1). */
@Component({
  selector: 'app-free-slot-sheet',
  imports: [FormsModule, Sheet, Tabs, RelativeDayPipe, SlotDatePipe],
  templateUrl: './free-slot-sheet.html',
  styleUrl: './free-slot-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeSlotSheet {
  readonly open = model(false);
  readonly row = input<ScheduleRow | null>(null);
  readonly services = input<readonly MasterService[]>([]);
  readonly clients = input<readonly CabinetClient[]>([]);
  readonly saving = input(false);

  readonly addExternal = output<ExternalRequest>();
  readonly bookForClient = output<SiteBookingRequest>();
  readonly move = output<{ slotId: string; start: string }>();
  readonly remove = output<string>();

  protected readonly modes = MODES;
  protected readonly serviceName = subcategoryName;

  protected readonly mode = linkedSignal<ScheduleRow | null, Mode>({
    source: this.row,
    computation: () => 'external',
  });
  protected readonly clientName = linkedSignal({ source: this.row, computation: () => '' });
  protected readonly note = linkedSignal({ source: this.row, computation: () => '' });
  protected readonly subcategoryId = linkedSignal(() => this.services()[0]?.subcategoryId ?? '');
  protected readonly clientId = linkedSignal(() => this.clients()[0]?.client.id ?? '');
  protected readonly time = linkedSignal(() => {
    const row = this.row();
    return row ? fmt(row.start, 'HH:mm') : '10:00';
  });

  protected readonly canAddExternal = computed(
    () => !!this.clientName().trim() && !!this.subcategoryId(),
  );

  protected submitExternal(): void {
    const row = this.row();
    if (!row || !this.canAddExternal()) return;
    this.addExternal.emit({
      start: row.start,
      subcategoryId: this.subcategoryId(),
      clientName: this.clientName().trim(),
      note: this.note().trim() || undefined,
    });
  }

  protected submitSite(): void {
    const slot = this.row()?.slot;
    if (!slot || !this.clientId() || !this.subcategoryId()) return;
    this.bookForClient.emit({
      clientId: this.clientId(),
      slotId: slot.id,
      subcategoryId: this.subcategoryId(),
    });
  }

  protected submitMove(): void {
    const slot = this.row()?.slot;
    if (!slot || !this.time()) return;
    this.move.emit({ slotId: slot.id, start: minskIso(dayKey(slot.start), this.time()) });
  }
}
