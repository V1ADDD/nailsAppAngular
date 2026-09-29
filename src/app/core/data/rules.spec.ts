import { type Booking, type Master } from './models';
import {
  bookingConflicts,
  distanceKm,
  editDistance,
  formatDistance,
  marketPriceRange,
  matchMaster,
  minPrice,
  pendingReleaseAt,
  slotStatusFor,
} from './rules';

function master(partial: Partial<Master>): Master {
  return {
    id: 'm',
    organizationId: null,
    name: 'Анна Серова',
    photoUrl: null,
    categoryIds: ['manicure'],
    specialty: 'Мастер ногтей',
    city: 'Минск',
    district: 'Центральный',
    address: 'ул. Ленина, 42',
    location: { lat: 53.9, lng: 27.56 },
    rating: 4.9,
    reviewsCount: 10,
    experienceYears: 3,
    verification: 'verified',
    online: true,
    replyMinutes: 10,
    about: '',
    courses: [],
    contacts: { phone: '', email: '' },
    services: [
      {
        id: 's1',
        subcategoryId: 'manicure-hardware',
        price: { kind: 'exact', amount: 45 },
        durationMin: 90,
      },
      {
        id: 's2',
        subcategoryId: 'manicure-gel',
        price: { kind: 'from', amount: 35 },
        durationMin: 60,
      },
    ],
    portfolio: [],
    bookingsCount: 0,
    schedule: { workDays: [1, 2, 3, 4, 5], from: '10:00', to: '19:00', slotMinutes: 90 },
    autoConfirm: { enabled: false, afterMinutes: 30 },
    ...partial,
  };
}

function booking(
  start: string,
  durationMin = 60,
  status: Booking['status'] = 'confirmed',
): Booking {
  return {
    id: start,
    masterId: 'm',
    clientId: 'c',
    subcategoryId: 'manicure-gel',
    price: { kind: 'exact', amount: 40 },
    start,
    durationMin,
    address: '',
    status,
    source: 'site',
    createdBy: 'client',
    createdAt: '2026-09-01T10:00:00.000Z',
    slotId: null,
    chatId: null,
  };
}

describe('geo', () => {
  it('computes distances within Minsk', () => {
    const km = distanceKm({ lat: 53.9045, lng: 27.5615 }, { lat: 53.9168, lng: 27.5856 });
    expect(km).toBeGreaterThan(1.5);
    expect(km).toBeLessThan(2.5);
  });

  it('formats distances in metres and kilometres', () => {
    expect(formatDistance(0.34)).toBe('350\u00a0м');
    expect(formatDistance(1.24)).toBe('1,2\u00a0км');
    expect(formatDistance(12.6)).toBe('13\u00a0км');
  });
});

describe('prices', () => {
  it('shows «от» for the cheapest of several services', () => {
    expect(minPrice(master({}).services)).toEqual({ kind: 'from', amount: 35 });
  });

  it('keeps an exact price when there is a single service', () => {
    expect(minPrice([master({}).services[0]!])).toEqual({ kind: 'exact', amount: 45 });
  });

  it('computes a market range only with enough data', () => {
    const masters = [30, 35, 40, 45, 60].map((amount, i) =>
      master({
        id: `m${i}`,
        services: [
          {
            id: 's',
            subcategoryId: 'manicure-gel',
            price: { kind: 'exact', amount },
            durationMin: 60,
          },
        ],
      }),
    );
    expect(marketPriceRange(masters, 'manicure-gel')).toEqual({ from: 30, to: 60 });
    expect(marketPriceRange(masters.slice(0, 2), 'manicure-gel')).toBeNull();
  });
});

describe('search', () => {
  const m = master({});

  it('measures edit distance', () => {
    expect(editDistance('маникюр', 'маникюр')).toBe(0);
    expect(editDistance('маникур', 'маникюр')).toBe(1);
  });

  it('prefers exact subcategory matches', () => {
    expect(matchMaster(m, 'аппаратный')).toEqual({
      score: 2,
      subcategoryIds: ['manicure-hardware'],
    });
  });

  it('matches synonyms: «ногти» → маникюр', () => {
    const match = matchMaster(m, 'ногти');
    expect(match.score).toBe(1);
    expect(match.subcategoryIds).toContain('manicure-gel');
  });

  it('tolerates typos', () => {
    expect(matchMaster(m, 'маникур').score).toBeGreaterThan(0);
    expect(matchMaster(m, 'шелак').subcategoryIds).toEqual(['manicure-gel']);
  });

  it('matches by master name and district', () => {
    expect(matchMaster(m, 'серова').score).toBe(1);
    expect(matchMaster(m, 'центральный').score).toBe(1);
  });

  it('returns no match for unrelated queries', () => {
    expect(matchMaster(m, 'массаж спины').score).toBe(0);
  });
});

describe('slots & bookings', () => {
  it('hides site-vs-external from clients', () => {
    expect(slotStatusFor('client', 'booked')).toBe('busy');
    expect(slotStatusFor('master', 'booked')).toBe('booked');
    expect(slotStatusFor('client', 'pending')).toBe('pending');
  });

  it('releases unconfirmed bookings 24 h before when booked more than a day ahead', () => {
    const release = pendingReleaseAt({
      start: '2026-10-10T10:00:00.000Z',
      createdAt: '2026-10-05T10:00:00.000Z',
    });
    expect(release.toISOString()).toBe('2026-10-09T10:00:00.000Z');
  });

  it('releases unconfirmed bookings 2 h before when booked less than a day ahead', () => {
    const release = pendingReleaseAt({
      start: '2026-10-10T10:00:00.000Z',
      createdAt: '2026-10-10T00:00:00.000Z',
    });
    expect(release.toISOString()).toBe('2026-10-10T08:00:00.000Z');
  });

  it('detects overlapping and too-close bookings', () => {
    const existing = [
      booking('2026-10-10T10:00:00.000Z', 90),
      booking('2026-10-10T12:30:00.000Z', 60),
      booking('2026-10-10T16:00:00.000Z', 60, 'cancelled'),
    ];
    const { overlapping, tooClose } = bookingConflicts(
      { start: '2026-10-10T11:00:00.000Z', durationMin: 60 },
      existing,
    );
    expect(overlapping.map((b) => b.id)).toEqual(['2026-10-10T10:00:00.000Z']);
    expect(tooClose.map((b) => b.id)).toEqual(['2026-10-10T12:30:00.000Z']);
  });
});
