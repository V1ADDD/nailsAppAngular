import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { formatAmount } from '@app/shared/format/price';
import { NBSP } from '@app/shared/format/text';
import { Icon } from '@app/shared/ui/icon/icon';
import {
  FREE_WINDOW_LABELS,
  type SearchFilters,
  activeFilterCount,
  serviceLabel,
} from '../../state/search-logic';

export type FilterSection = 'all' | 'service' | 'price' | 'distance' | 'rating' | 'window' | 'city';

interface ChipView {
  section: Exclude<FilterSection, 'all'>;
  label: string;
  active: boolean;
}

/** Horizontal chip row of design 01, with all ТЗ 5.2 filters and their current values. */
@Component({
  selector: 'app-filter-chips',
  imports: [Icon],
  template: `
    <div class="chip-row chips" role="toolbar" aria-label="Фильтры">
      <button
        type="button"
        class="chip"
        [class.chip--active]="count() > 0"
        aria-haspopup="dialog"
        (click)="openSection.emit('all')"
      >
        <app-icon name="sliders-horizontal" [size]="16" />
        Фильтры
        @if (count() > 0) {
          <span class="chip__count">{{ count() }}</span>
        }
      </button>
      @for (chip of chips(); track chip.section) {
        @if (chip.section === 'window') {
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="filters().onlineOnly"
            (click)="toggleFilter.emit('onlineOnly')"
          >
            <span class="dot dot--success" aria-hidden="true"></span>
            Онлайн
          </button>
        }
        <button
          type="button"
          class="chip"
          [class.chip--active]="chip.active"
          aria-haspopup="dialog"
          (click)="openSection.emit(chip.section)"
        >
          {{ chip.label }}
          <app-icon name="chevron-down" [size]="14" />
        </button>
      }
      <button
        type="button"
        class="chip"
        [attr.aria-pressed]="filters().verifiedOnly"
        (click)="toggleFilter.emit('verifiedOnly')"
      >
        <app-icon name="badge-check" [size]="16" />
        Проверенные
      </button>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .chips {
      padding: var(--space-0-5) var(--space-4) var(--space-1);
      scroll-padding-inline: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChips {
  readonly filters = input.required<SearchFilters>();
  readonly openSection = output<FilterSection>();
  readonly toggleFilter = output<'onlineOnly' | 'verifiedOnly'>();

  protected readonly count = computed(() => activeFilterCount(this.filters()));

  protected readonly chips = computed<ChipView[]>(() => {
    const f = this.filters();
    const service = serviceLabel(f);
    return [
      { section: 'service', label: service ?? 'Услуга', active: !!service },
      {
        section: 'price',
        label: priceLabel(f),
        active: f.priceFrom !== null || f.priceTo !== null,
      },
      {
        section: 'distance',
        label: f.maxDistanceKm !== null ? `до ${f.maxDistanceKm}${NBSP}км` : 'Расстояние',
        active: f.maxDistanceKm !== null,
      },
      {
        section: 'rating',
        label: f.minRating !== null ? `от ${String(f.minRating).replace('.', ',')} ★` : 'Рейтинг',
        active: f.minRating !== null,
      },
      {
        section: 'window',
        label: f.freeWindow ? FREE_WINDOW_LABELS[f.freeWindow] : 'Свободное окно',
        active: f.freeWindow !== null,
      },
      { section: 'city', label: f.city ?? 'Город', active: f.city !== null },
    ];
  });
}

function priceLabel(f: SearchFilters): string {
  if (f.priceFrom !== null && f.priceTo !== null) {
    return `${f.priceFrom}–${formatAmount(f.priceTo)}`;
  }
  if (f.priceFrom !== null) return `от ${formatAmount(f.priceFrom)}`;
  if (f.priceTo !== null) return `до ${formatAmount(f.priceTo)}`;
  return 'Цена';
}
