import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { subcategoryName } from '@app/core/data/catalog';
import { formatDistance } from '@app/core/data/rules';
import { plural } from '@app/shared/format/plural';
import { PricePipe } from '@app/shared/format/price';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { Rating } from '@app/shared/ui/rating/rating';
import { type MasterResult, preselectedService } from '../../state/search-logic';

/**
 * ТЗ 5.5: a search result with only the relevant info — the matched service group
 * (collapsed to «от X р», expandable), rating, experience, distance and actions.
 */
@Component({
  selector: 'app-master-card',
  imports: [RouterLink, Avatar, Icon, Rating, PricePipe],
  templateUrl: './master-card.html',
  styleUrl: './master-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterCard {
  private static nextId = 0;
  protected readonly servicesId = `master-card-services-${MasterCard.nextId++}`;

  readonly result = input.required<MasterResult>();
  readonly active = input(false);
  readonly favorite = input(false);
  /** The user's own master profile: no booking / messaging buttons. */
  readonly own = input(false);

  /** Emits the subcategory to preselect in the booking flow, if the match is unambiguous. */
  readonly book = output<string | null>();
  readonly write = output<void>();
  readonly favoriteToggle = output<void>();

  protected readonly expanded = signal(false);

  protected readonly master = computed(() => this.result().master);
  protected readonly services = computed(() =>
    this.result().relevantServices.map((s) => ({ ...s, name: subcategoryName(s.subcategoryId) })),
  );
  protected readonly experience = computed(() => {
    const years = this.master().experienceYears;
    return years < 1 ? 'Опыт меньше года' : `Опыт ${plural(years, ['год', 'года', 'лет'])}`;
  });
  protected readonly distance = computed(() => formatDistance(this.result().distanceKm));
  protected readonly groupLabel = computed(() => {
    const services = this.services();
    if (services.length === 1) return services[0]!.name;
    const count = plural(services.length, ['услуга', 'услуги', 'услуг']);
    return this.result().narrowed ? `Подходящие: ${count}` : `Все услуги: ${count}`;
  });

  /** Carried into the profile link and the booking flow (`?service=`). */
  protected readonly serviceId = computed(() => preselectedService(this.result()));

  protected onBook(): void {
    this.book.emit(this.serviceId());
  }
}
