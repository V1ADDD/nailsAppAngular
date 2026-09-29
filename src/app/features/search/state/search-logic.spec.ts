import { type Master, type Slot } from '@app/core/data/models';
import {
  EMPTY_FILTERS,
  type SearchInput,
  activeFilterCount,
  needsSlots,
  nextFreeSlot,
  searchMasters,
  serviceSuggestions,
  windowDays,
} from './search-logic';

const HOME = { lat: 53.9038, lng: 27.5567 };

function master(partial: Partial<Master> & { id: string }): Master {
  return {
    organizationId: null,
    name: 'Анна Серова',
    photoUrl: null,
    categoryIds: ['manicure'],
    specialty: 'Мастер ногтей',
    city: 'Минск',
    district: 'Центральный',
    address: 'ул. Ленина, 42',
    location: HOME,
    rating: 4.5,
    reviewsCount: 10,
    experienceYears: 3,
    verification: 'none',
    online: false,
    replyMinutes: 10,
    about: '',
    courses: [],
    contacts: { phone: '', email: '' },
    services: [
      {
        id: 's1',
        subcategoryId: 'manicure-hardware',
        price: { kind: 'exact', amount: 35 },
        durationMin: 60,
      },
      {
        id: 's2',
        subcategoryId: 'manicure-gel',
        price: { kind: 'from', amount: 40 },
        durationMin: 90,
      },
    ],
    portfolio: [],
    bookingsCount: 0,
    schedule: { workDays: [1], from: '10:00', to: '19:00', slotMinutes: 60 },
    autoConfirm: { enabled: false, afterMinutes: 30 },
    ...partial,
  };
}

// ~1.1 km and ~5.5 km north of HOME.
const near = master({
  id: 'near',
  location: { lat: 53.9138, lng: 27.5567 },
  rating: 4.9,
  online: true,
  bookingsCount: 10,
});
const far = master({
  id: 'far',
  name: 'Марина Ковалёва',
  specialty: 'Бровист',
  categoryIds: ['brows'],
  location: { lat: 53.9538, lng: 27.5567 },
  rating: 4.2,
  verification: 'verified',
  bookingsCount: 500,
  services: [
    {
      id: 'b1',
      subcategoryId: 'brows-correction',
      price: { kind: 'exact', amount: 15 },
      durationMin: 30,
    },
  ],
});
const brest = master({ id: 'brest', city: 'Брест', location: { lat: 52.09, lng: 23.7 } });

const NOW = new Date('2026-09-29T09:00:00Z'); // Tuesday, 12:00 in Minsk

function input(patch: Partial<SearchInput> = {}): SearchInput {
  return {
    masters: [far, brest, near],
    query: '',
    filters: EMPTY_FILTERS,
    sort: 'distance',
    location: HOME,
    slots: {},
    now: NOW,
    ...patch,
  };
}

const ids = (i: SearchInput) => searchMasters(i).map((r) => r.master.id);

function slot(masterId: string, start: string, status: Slot['status'] = 'free'): Slot {
  return { id: `${masterId}-${start}`, masterId, start, durationMin: 60, status, bookingId: null };
}

describe('searchMasters', () => {
  it('sorts by distance by default and shows all services when nothing narrows', () => {
    const results = searchMasters(input());
    expect(results.map((r) => r.master.id)).toEqual(['near', 'far', 'brest']);
    expect(results[0]!.relevantServices).toHaveLength(2);
    expect(results[0]!.narrowed).toBe(false);
    expect(results[0]!.minPrice).toEqual({ kind: 'from', amount: 35 });
  });

  it('filters by service category/subcategory and keeps only relevant services', () => {
    const results = searchMasters(
      input({
        filters: { ...EMPTY_FILTERS, categoryId: 'manicure', subcategoryId: 'manicure-gel' },
      }),
    );
    expect(results.map((r) => r.master.id)).toEqual(['near', 'brest']);
    expect(results[0]!.relevantServices.map((s) => s.id)).toEqual(['s2']);
    expect(results[0]!.minPrice).toEqual({ kind: 'from', amount: 40 });
  });

  it('applies distance, rating, online, city, verification and price filters', () => {
    expect(ids(input({ filters: { ...EMPTY_FILTERS, maxDistanceKm: 3 } }))).toEqual(['near']);
    expect(ids(input({ filters: { ...EMPTY_FILTERS, minRating: 4.5 } }))).toEqual([
      'near',
      'brest',
    ]);
    expect(ids(input({ filters: { ...EMPTY_FILTERS, onlineOnly: true } }))).toEqual(['near']);
    expect(ids(input({ filters: { ...EMPTY_FILTERS, city: 'Брест' } }))).toEqual(['brest']);
    expect(ids(input({ filters: { ...EMPTY_FILTERS, verifiedOnly: true } }))).toEqual(['far']);
    const cheap = searchMasters(input({ filters: { ...EMPTY_FILTERS, priceTo: 36 } }));
    expect(cheap.map((r) => r.master.id)).toEqual(['near', 'far', 'brest']);
    expect(cheap[0]!.relevantServices.map((s) => s.id)).toEqual(['s1']);
    expect(ids(input({ filters: { ...EMPTY_FILTERS, priceFrom: 20, priceTo: 30 } }))).toEqual([]);
  });

  it('ranks exact subcategory matches above fuzzy ones (ТЗ 5.6)', () => {
    const fuzzyOnly = master({
      id: 'fuzzy',
      location: HOME,
      services: [
        {
          id: 'p1',
          subcategoryId: 'pedicure-classic',
          price: { kind: 'exact', amount: 30 },
          durationMin: 60,
        },
      ],
    });
    // «педикюр» is exact for pedicure-classic; nothing else matches.
    expect(ids(input({ masters: [near, fuzzyOnly], query: 'педикюр' }))).toEqual(['fuzzy']);
    // «ногти» is a category synonym: fuzzy match, all manicure services relevant.
    const nails = searchMasters(input({ masters: [near, far], query: 'ногти' }));
    expect(nails.map((r) => r.master.id)).toEqual(['near']);
    expect(nails[0]!.score).toBe(1);
    const exactFirst = searchMasters(
      input({ masters: [far, near], query: 'аппаратный', sort: 'popularity' }),
    );
    expect(exactFirst[0]!.master.id).toBe('near');
    expect(exactFirst[0]!.relevantServices.map((s) => s.id)).toEqual(['s1']);
  });

  it('sorts by rating, price and popularity', () => {
    expect(ids(input({ sort: 'rating' }))).toEqual(['near', 'brest', 'far']);
    expect(ids(input({ sort: 'price' }))).toEqual(['far', 'near', 'brest']);
    expect(ids(input({ sort: 'popularity' }))).toEqual(['far', 'near', 'brest']);
  });

  it('filters by free window and sorts by the earliest free slot', () => {
    const slots = {
      near: [slot('near', '2026-10-01T08:00:00Z'), slot('near', '2026-09-29T12:00:00Z', 'busy')],
      far: [slot('far', '2026-09-29T13:00:00Z')],
      brest: [],
    };
    expect(ids(input({ slots, filters: { ...EMPTY_FILTERS, freeWindow: 'today' } }))).toEqual([
      'far',
    ]);
    expect(ids(input({ slots, sort: 'slot' }))).toEqual(['far', 'near', 'brest']);
  });
});

describe('helpers', () => {
  it('windowDays covers today, tomorrow and the nearest weekend', () => {
    expect(windowDays('today', NOW)).toEqual(['2026-09-29']);
    expect(windowDays('tomorrow', NOW)).toEqual(['2026-09-30']);
    expect(windowDays('weekend', NOW)).toEqual(['2026-10-03', '2026-10-04']);
    expect(windowDays('weekend', new Date('2026-10-04T09:00:00Z'))).toEqual(['2026-10-04']);
  });

  it('nextFreeSlot ignores past and non-free slots', () => {
    expect(
      nextFreeSlot(
        [
          slot('m', '2026-09-28T08:00:00Z'),
          slot('m', '2026-09-29T10:00:00Z', 'pending'),
          slot('m', '2026-09-30T10:00:00Z'),
        ],
        NOW,
      ),
    ).toBe('2026-09-30T10:00:00Z');
    expect(nextFreeSlot(undefined, NOW)).toBeNull();
  });

  it('counts active filters and knows when slots are needed', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
    expect(
      activeFilterCount({ ...EMPTY_FILTERS, onlineOnly: true, priceTo: 50, categoryId: 'x' }),
    ).toBe(3);
    expect(needsSlots(EMPTY_FILTERS, 'distance')).toBe(false);
    expect(needsSlots(EMPTY_FILTERS, 'slot')).toBe(true);
    expect(needsSlots({ ...EMPTY_FILTERS, freeWindow: 'today' }, 'rating')).toBe(true);
  });

  it('suggests catalog entries, including synonyms', () => {
    expect(serviceSuggestions('м')).toEqual([]);
    expect(serviceSuggestions('педик').map((s) => s.id)).toContain('pedicure');
    expect(serviceSuggestions('шеллак').map((s) => s.id)).toEqual(['manicure-gel']);
  });
});
