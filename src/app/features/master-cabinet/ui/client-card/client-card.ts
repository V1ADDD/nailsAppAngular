import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { type CabinetClient } from '@app/core/data/api';
import { RelativeDayPipe } from '@app/shared/format/dates';
import { PluralPipe } from '@app/shared/format/plural';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { Rating } from '@app/shared/ui/rating/rating';

/** ТЗ 7.2 client card in the master's list. */
@Component({
  selector: 'app-client-card',
  imports: [Avatar, Icon, Rating, DatePipe, RelativeDayPipe, PluralPipe],
  templateUrl: './client-card.html',
  styleUrl: './client-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientCard {
  readonly entry = input.required<CabinetClient>();
  readonly busy = input(false);
  readonly write = output<string>();

  protected readonly telHref = computed(
    () => `tel:${this.entry().client.phone.replace(/[^\d+]/g, '')}`,
  );
  protected readonly preferred = computed(() =>
    this.entry().client.preferredContact === 'phone' ? 'звонок' : 'сообщения',
  );
}
