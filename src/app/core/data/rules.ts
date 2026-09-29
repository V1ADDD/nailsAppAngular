// Business rules from the ТЗ as pure functions, so they are testable and shared by
// the mock backend and the UI.
import { SERVICE_CATALOG, findSubcategory } from './catalog';
import {
  type Booking,
  type ClientSlotStatus,
  type LatLng,
  type Master,
  type MasterService,
  type Price,
  type SlotStatus,
} from './models';

const HOUR_MS = 3_600_000;

// ── Geo ───────────────────────────────────────────────────────────────────────

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** «350 м», «1,2 км», «12 км». */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)}\u00a0м`;
  if (km < 10) return `${km.toFixed(1).replace('.', ',')}\u00a0км`;
  return `${Math.round(km)}\u00a0км`;
}

// ── Prices ────────────────────────────────────────────────────────────────────

export function priceValue(price: Price): number {
  return price.kind === 'free' ? 0 : price.amount;
}

/**
 * Cheapest service among `services`, shown as «от X р» when there is more than one price.
 * Add-ons (removal, nail art) are ignored unless nothing else is left, so the headline
 * price is what a real visit costs (ТЗ 1.2: no Kufar-style «cheapest item» prices).
 */
export function minPrice(all: readonly MasterService[]): Price | null {
  const main = all.filter((s) => !findSubcategory(s.subcategoryId)?.addon);
  const services = main.length ? main : all;
  if (services.length === 0) return null;
  const cheapest = services.reduce((a, b) => (priceValue(b.price) < priceValue(a.price) ? b : a));
  if (services.length === 1) return cheapest.price;
  return cheapest.price.kind === 'free'
    ? cheapest.price
    : { kind: 'from', amount: cheapest.price.amount };
}

/**
 * ТЗ 4.2 «обычно эта услуга стоит от X до Y»: the 10th–90th percentile of prices other
 * masters charge for the subcategory. Null when there is too little data.
 */
export function marketPriceRange(
  masters: readonly Master[],
  subcategoryId: string,
): { from: number; to: number } | null {
  const prices = masters
    .flatMap((m) => m.services)
    .filter((s) => s.subcategoryId === subcategoryId && s.price.kind !== 'free')
    .map((s) => priceValue(s.price))
    .sort((a, b) => a - b);
  if (prices.length < 3) return null;
  const at = (q: number) => prices[Math.min(prices.length - 1, Math.floor(q * prices.length))]!;
  return { from: at(0.1), to: at(0.9) };
}

// ── Search (ТЗ 5.6) ───────────────────────────────────────────────────────────

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance with an early exit once `max` is exceeded. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      rowMin = Math.min(rowMin, curr[j]!);
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length]!;
}

/** Allowed typos grow with word length: 0 for ≤3 letters, 1 up to 6, then 2. */
function typoBudget(word: string): number {
  return word.length <= 3 ? 0 : word.length <= 6 ? 1 : 2;
}

/** True when every query word prefix-matches or fuzzily matches some word of `text`. */
export function fuzzyIncludes(text: string, query: string): boolean {
  const words = normalize(text).split(' ');
  return normalize(query)
    .split(' ')
    .filter(Boolean)
    .every((q) =>
      words.some(
        (w) =>
          w.startsWith(q) ||
          editDistance(
            q,
            w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 1))),
            typoBudget(q),
          ) <= typoBudget(q),
      ),
    );
}

export interface SearchMatch {
  /** 2 = exact subcategory match, 1 = fuzzy/synonym match, 0 = no match. */
  score: 0 | 1 | 2;
  /** Subcategories of this master that matched, to show in the card («только релевантное»). */
  subcategoryIds: string[];
}

/**
 * ТЗ 5.6: exact match on a subcategory first, then fuzzy matching (typos) and synonyms
 * («ногти» → маникюр). Also matches master name, specialty, district and city.
 */
export function matchMaster(master: Master, query: string): SearchMatch {
  const q = normalize(query);
  if (!q) return { score: 2, subcategoryIds: [] };

  const exact: string[] = [];
  const fuzzy: string[] = [];
  for (const service of master.services) {
    const sub = findSubcategory(service.subcategoryId);
    if (!sub) continue;
    const category = SERVICE_CATALOG.find((c) => c.id === sub.categoryId);
    const name = normalize(sub.name);
    if (name === q || name.startsWith(q) || name.includes(q)) {
      exact.push(sub.id);
      continue;
    }
    const haystacks = [
      sub.name,
      ...(sub.synonyms ?? []),
      category?.name ?? '',
      ...(category?.synonyms ?? []),
    ];
    if (haystacks.some((h) => fuzzyIncludes(h, q))) fuzzy.push(sub.id);
  }
  if (exact.length) return { score: 2, subcategoryIds: exact };
  if (fuzzy.length) return { score: 1, subcategoryIds: fuzzy };

  const profile = [master.name, master.specialty, master.district, master.city].join(' ');
  return fuzzyIncludes(profile, q)
    ? { score: 1, subcategoryIds: [] }
    : { score: 0, subcategoryIds: [] };
}

// ── Slots & bookings (ТЗ 6) ───────────────────────────────────────────────────

/** ТЗ 6.2: clients never see whether a busy slot is a site booking or an external one. */
export function slotStatusFor(
  role: 'client' | 'master',
  status: SlotStatus,
): SlotStatus | ClientSlotStatus {
  if (role === 'master') return status;
  return status === 'booked' ? 'busy' : status;
}

/**
 * ТЗ 6.4: an unconfirmed booking releases its slot 24 h before the start when it was made
 * more than 24 h ahead, otherwise 2 h before the start. Edge case the ТЗ doesn't cover: a
 * booking made less than 2 h ahead would be released immediately, so the master gets
 * until the start instead.
 */
export function pendingReleaseAt(booking: Pick<Booking, 'start' | 'createdAt'>): Date {
  const start = new Date(booking.start).getTime();
  const leadTime = start - new Date(booking.createdAt).getTime();
  if (leadTime <= 2 * HOUR_MS) return new Date(start);
  return new Date(start - (leadTime > 24 * HOUR_MS ? 24 : 2) * HOUR_MS);
}

export function overlaps(
  a: { start: string; durationMin: number },
  b: { start: string; durationMin: number },
): boolean {
  const aStart = new Date(a.start).getTime();
  const bStart = new Date(b.start).getTime();
  return aStart < bStart + b.durationMin * 60_000 && bStart < aStart + a.durationMin * 60_000;
}

/** Minimum gap the ТЗ 6.10 warning asks for between two bookings on the same day. */
export const MIN_GAP_BETWEEN_BOOKINGS_MIN = 60;

/**
 * ТЗ 6.10: a client can't hold two bookings at the same time (the earlier one gets
 * cancelled), and gets a warning when bookings on the same day are too close together.
 */
export function bookingConflicts(
  candidate: { start: string; durationMin: number },
  existing: readonly Booking[],
): { overlapping: Booking[]; tooClose: Booking[] } {
  const active = existing.filter((b) => b.status === 'pending' || b.status === 'confirmed');
  const overlapping = active.filter((b) => overlaps(candidate, b));
  const gap = MIN_GAP_BETWEEN_BOOKINGS_MIN;
  const widened = {
    start: new Date(new Date(candidate.start).getTime() - gap * 60_000).toISOString(),
    durationMin: candidate.durationMin + gap * 2,
  };
  const tooClose = active.filter((b) => !overlapping.includes(b) && overlaps(widened, b));
  return { overlapping, tooClose };
}
