// Pure search / filter / sort logic of the map screen (ТЗ 5.2, 5.3, 5.6). No Angular here,
// so it is unit-testable and reused for the «Показать N мастеров» preview count.
import { SERVICE_CATALOG, findCategory, findSubcategory } from '@app/core/data/catalog';
import {
  type LatLng,
  type Master,
  type MasterService,
  type Price,
  type Slot,
} from '@app/core/data/models';
import {
  distanceKm,
  fuzzyIncludes,
  matchMaster,
  minPrice,
  normalize,
  priceValue,
} from '@app/core/data/rules';
import { addDays, dayKey } from '@app/shared/format/dates';

export type FreeWindow = 'today' | 'tomorrow' | 'weekend';
export type SortKey = 'distance' | 'rating' | 'price' | 'slot' | 'popularity';

export interface SearchFilters {
  /** Service filter: a whole category or one subcategory of it (ТЗ 4.2 two levels). */
  categoryId: string | null;
  subcategoryId: string | null;
  priceFrom: number | null;
  priceTo: number | null;
  maxDistanceKm: number | null;
  minRating: number | null;
  onlineOnly: boolean;
  freeWindow: FreeWindow | null;
  city: string | null;
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: SearchFilters = {
  categoryId: null,
  subcategoryId: null,
  priceFrom: null,
  priceTo: null,
  maxDistanceKm: null,
  minRating: null,
  onlineOnly: false,
  freeWindow: null,
  city: null,
  verifiedOnly: false,
};

export const DISTANCE_OPTIONS = [1, 3, 5, 10] as const;
export const RATING_OPTIONS = [3, 4, 4.5] as const;

export const SORT_LABELS: Record<SortKey, string> = {
  distance: 'Ближе',
  rating: 'Рейтинг',
  price: 'Дешевле',
  slot: 'Ближайшее окно',
  popularity: 'Популярные',
};

export const FREE_WINDOW_LABELS: Record<FreeWindow, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'Выходные',
};

export interface MasterResult {
  master: Master;
  distanceKm: number;
  /** Services that match the query / service filter (all services when nothing narrows). */
  relevantServices: MasterService[];
  /** True when a query or the service filter narrowed `relevantServices`. */
  narrowed: boolean;
  minPrice: Price | null;
  /** 2 = exact subcategory match, 1 = fuzzy (ТЗ 5.6); 2 when there is no query. */
  score: 1 | 2;
  /** Start of the earliest free slot, when slots are loaded. */
  nextFreeSlot: string | null;
}

export interface SearchInput {
  masters: readonly Master[];
  query: string;
  filters: SearchFilters;
  sort: SortKey;
  location: LatLng;
  /** Client-masked slots per master id; missing entries mean «not loaded». */
  slots: Readonly<Record<string, readonly Slot[]>>;
  now: Date;
}

/** Whether the filters or sort need slots (free window filter, «ближайшее окно» sort). */
export function needsSlots(filters: SearchFilters, sort: SortKey): boolean {
  return filters.freeWindow !== null || sort === 'slot';
}

/** Minsk day keys a free-window option covers. «Выходные» = the nearest Sat + Sun. */
export function windowDays(window: FreeWindow, now: Date): string[] {
  if (window === 'today') return [dayKey(now)];
  if (window === 'tomorrow') return [dayKey(addDays(now, 1))];
  // ISO weekday in Minsk (1 = Mon … 7 = Sun), derived from the Minsk day key.
  const weekday = new Date(`${dayKey(now)}T12:00:00Z`).getUTCDay() || 7;
  if (weekday === 7) return [dayKey(now)];
  const toSaturday = 6 - weekday;
  return [dayKey(addDays(now, toSaturday)), dayKey(addDays(now, toSaturday + 1))];
}

export function nextFreeSlot(slots: readonly Slot[] | undefined, now: Date): string | null {
  if (!slots) return null;
  const nowIso = now.toISOString();
  let best: string | null = null;
  for (const s of slots) {
    if (s.status === 'free' && s.start > nowIso && (best === null || s.start < best)) {
      best = s.start;
    }
  }
  return best;
}

function hasFreeSlotOn(slots: readonly Slot[] | undefined, days: string[], now: Date): boolean {
  if (!slots) return false;
  const nowIso = now.toISOString();
  return slots.some(
    (s) => s.status === 'free' && s.start > nowIso && days.includes(dayKey(s.start)),
  );
}

function serviceFilter(filters: SearchFilters): ((s: MasterService) => boolean) | null {
  if (filters.subcategoryId) return (s) => s.subcategoryId === filters.subcategoryId;
  if (filters.categoryId) {
    return (s) => findSubcategory(s.subcategoryId)?.categoryId === filters.categoryId;
  }
  return null;
}

function inPriceRange(service: MasterService, from: number | null, to: number | null): boolean {
  const value = priceValue(service.price);
  return (from === null || value >= from) && (to === null || value <= to);
}

/** One master through search + filters; null when it does not match. */
export function evaluateMaster(
  master: Master,
  input: Omit<SearchInput, 'masters' | 'sort'>,
): MasterResult | null {
  const { filters, query, location, slots, now } = input;
  const distance = distanceKm(location, master.location);

  if (filters.city && master.city !== filters.city) return null;
  if (filters.maxDistanceKm !== null && distance > filters.maxDistanceKm) return null;
  if (filters.minRating !== null && master.rating < filters.minRating) return null;
  if (filters.onlineOnly && !master.online) return null;
  if (filters.verifiedOnly && master.verification !== 'verified') return null;
  if (filters.freeWindow) {
    const days = windowDays(filters.freeWindow, now);
    if (!hasFreeSlotOn(slots[master.id], days, now)) return null;
  }

  let services: MasterService[] = [...master.services];
  let narrowed = false;
  const byService = serviceFilter(filters);
  if (byService) {
    services = services.filter(byService);
    narrowed = true;
    if (!services.length) return null;
  }

  const match = matchMaster(master, query);
  if (match.score === 0) return null;
  if (match.subcategoryIds.length) {
    services = services.filter((s) => match.subcategoryIds.includes(s.subcategoryId));
    narrowed = true;
    if (!services.length) return null;
  }

  if (filters.priceFrom !== null || filters.priceTo !== null) {
    services = services.filter((s) => inPriceRange(s, filters.priceFrom, filters.priceTo));
    narrowed = true;
    if (!services.length) return null;
  }

  return {
    master,
    distanceKm: distance,
    relevantServices: services,
    narrowed,
    minPrice: minPrice(services),
    score: match.score,
    nextFreeSlot: nextFreeSlot(slots[master.id], now),
  };
}

const compareBy: Record<SortKey, (a: MasterResult, b: MasterResult) => number> = {
  distance: (a, b) => a.distanceKm - b.distanceKm,
  rating: (a, b) =>
    b.master.rating - a.master.rating || b.master.reviewsCount - a.master.reviewsCount,
  price: (a, b) =>
    (a.minPrice ? priceValue(a.minPrice) : Infinity) -
    (b.minPrice ? priceValue(b.minPrice) : Infinity),
  slot: (a, b) => {
    if (a.nextFreeSlot === b.nextFreeSlot) return 0;
    if (a.nextFreeSlot === null) return 1;
    if (b.nextFreeSlot === null) return -1;
    return a.nextFreeSlot < b.nextFreeSlot ? -1 : 1;
  },
  popularity: (a, b) => b.master.bookingsCount - a.master.bookingsCount,
};

/** ТЗ 5.6 + 5.3: exact matches first, then the chosen sort, then distance. */
export function searchMasters(input: SearchInput): MasterResult[] {
  const results = input.masters
    .map((m) => evaluateMaster(m, input))
    .filter((r): r is MasterResult => r !== null);
  const bySort = compareBy[input.sort];
  return results.sort((a, b) => b.score - a.score || bySort(a, b) || a.distanceKm - b.distanceKm);
}

export function activeFilterCount(f: SearchFilters): number {
  return [
    f.categoryId !== null || f.subcategoryId !== null,
    f.priceFrom !== null || f.priceTo !== null,
    f.maxDistanceKm !== null,
    f.minRating !== null,
    f.onlineOnly,
    f.freeWindow !== null,
    f.city !== null,
    f.verifiedOnly,
  ].filter(Boolean).length;
}

// ── Search suggestions (catalog) ──────────────────────────────────────────────

export interface ServiceSuggestion {
  kind: 'category' | 'subcategory';
  id: string;
  label: string;
  /** Category name for subcategories, shown as a hint. */
  hint: string | null;
}

/** Catalog entries matching the typed text, exact/prefix matches first. */
export function serviceSuggestions(query: string, limit = 6): ServiceSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const exact: ServiceSuggestion[] = [];
  const fuzzy: ServiceSuggestion[] = [];
  for (const category of SERVICE_CATALOG) {
    const entry: ServiceSuggestion = {
      kind: 'category',
      id: category.id,
      label: category.name,
      hint: null,
    };
    if (normalize(category.name).includes(q)) exact.push(entry);
    else if ([category.name, ...(category.synonyms ?? [])].some((h) => fuzzyIncludes(h, q))) {
      fuzzy.push(entry);
    }
    for (const sub of category.subcategories) {
      const subEntry: ServiceSuggestion = {
        kind: 'subcategory',
        id: sub.id,
        label: sub.name,
        hint: category.name,
      };
      if (normalize(sub.name).includes(q)) exact.push(subEntry);
      else if ([sub.name, ...(sub.synonyms ?? [])].some((h) => fuzzyIncludes(h, q))) {
        fuzzy.push(subEntry);
      }
    }
  }
  return [...exact, ...fuzzy].slice(0, limit);
}

/** Label of the service filter: subcategory name, else category name. */
export function serviceLabel(
  f: Pick<SearchFilters, 'categoryId' | 'subcategoryId'>,
): string | null {
  if (f.subcategoryId) return findSubcategory(f.subcategoryId)?.name ?? null;
  if (f.categoryId) return findCategory(f.categoryId)?.name ?? null;
  return null;
}

/**
 * The service to preselect when booking from a result: only when the filter / query narrowed
 * the master down to exactly one service.
 */
export function preselectedService(result: MasterResult): string | null {
  const ids = new Set(result.relevantServices.map((s) => s.subcategoryId));
  return result.narrowed && ids.size === 1 ? result.relevantServices[0]!.subcategoryId : null;
}
