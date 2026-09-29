import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { SERVICE_CATALOG, findCategory } from '@app/core/data/catalog';
import { CITIES } from '@app/core/data/fixtures/masters.fixtures';
import { PluralPipe } from '@app/shared/format/plural';
import { NBSP } from '@app/shared/format/text';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import {
  DISTANCE_OPTIONS,
  EMPTY_FILTERS,
  FREE_WINDOW_LABELS,
  type FreeWindow,
  RATING_OPTIONS,
  type SearchFilters,
} from '../../state/search-logic';
import { type Choice, ChoiceGroup } from '../choice-group/choice-group';
import { type FilterSection } from '../filter-chips/filter-chips';

const TITLES: Record<FilterSection, string> = {
  all: 'Фильтры',
  service: 'Услуга',
  price: 'Цена',
  distance: 'Расстояние',
  rating: 'Рейтинг',
  window: 'Свободное окно',
  city: 'Город',
};

/** Which draft fields «Сбросить» clears in each section. */
const SECTION_FIELDS: Record<Exclude<FilterSection, 'all'>, (keyof SearchFilters)[]> = {
  service: ['categoryId', 'subcategoryId'],
  price: ['priceFrom', 'priceTo'],
  distance: ['maxDistanceKm'],
  rating: ['minRating'],
  window: ['freeWindow'],
  city: ['city'],
};

/**
 * ТЗ 5.2 filters in a sheet. Edits a draft (`filters` model) so the page can preview
 * «Показать N мастеров» before applying. `section` narrows it to one filter (chip tap).
 */
@Component({
  selector: 'app-filters-sheet',
  imports: [Sheet, ChoiceGroup, PluralPipe],
  templateUrl: './filters-sheet.html',
  styleUrl: './filters-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersSheet {
  readonly open = model(false);
  readonly section = input<FilterSection>('all');
  readonly filters = model.required<SearchFilters>();
  readonly previewCount = input(0);
  readonly previewLoading = input(false);
  readonly apply = output<void>();

  protected readonly title = computed(() => TITLES[this.section()]);

  protected readonly categories: Choice<string | null>[] = [
    { value: null, label: 'Любая' },
    ...SERVICE_CATALOG.map((c) => ({ value: c.id, label: c.name })),
  ];
  protected readonly subcategories = computed<Choice<string | null>[]>(() => {
    const category = findCategory(this.filters().categoryId ?? '');
    if (!category) return [];
    return [
      { value: null, label: 'Все' },
      ...category.subcategories.map((s) => ({ value: s.id, label: s.name })),
    ];
  });
  protected readonly distances: Choice<number | null>[] = [
    { value: null, label: 'Любое' },
    ...DISTANCE_OPTIONS.map((km) => ({ value: km, label: `до ${km}${NBSP}км` })),
  ];
  protected readonly ratings: Choice<number | null>[] = [
    { value: null, label: 'Любой' },
    ...RATING_OPTIONS.map((r) => ({ value: r, label: `от ${String(r).replace('.', ',')} ★` })),
  ];
  protected readonly windows: Choice<FreeWindow | null>[] = [
    { value: null, label: 'Любое' },
    { value: 'today', label: FREE_WINDOW_LABELS.today },
    { value: 'tomorrow', label: FREE_WINDOW_LABELS.tomorrow },
    { value: 'weekend', label: 'Ближайшие выходные' },
  ];
  protected readonly cities: Choice<string | null>[] = [
    { value: null, label: 'Любой' },
    ...CITIES.map((c) => ({ value: c, label: c })),
  ];

  protected shows(section: Exclude<FilterSection, 'all'>): boolean {
    return this.section() === 'all' || this.section() === section;
  }

  protected patch(patch: Partial<SearchFilters>): void {
    this.filters.set({ ...this.filters(), ...patch });
  }

  protected setCategory(categoryId: string | null): void {
    if (categoryId !== this.filters().categoryId) this.patch({ categoryId, subcategoryId: null });
  }

  protected setPrice(field: 'priceFrom' | 'priceTo', event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim().replace(',', '.');
    const value = raw === '' ? null : Number(raw);
    this.patch({ [field]: value === null || Number.isNaN(value) ? null : Math.max(0, value) });
  }

  protected setToggle(field: 'onlineOnly' | 'verifiedOnly', event: Event): void {
    this.patch({ [field]: (event.target as HTMLInputElement).checked });
  }

  protected reset(): void {
    const section = this.section();
    if (section === 'all') {
      this.filters.set(EMPTY_FILTERS);
      return;
    }
    const cleared = Object.fromEntries(
      SECTION_FIELDS[section].map((key) => [key, EMPTY_FILTERS[key]]),
    ) as Partial<SearchFilters>;
    this.patch(cleared);
  }
}
