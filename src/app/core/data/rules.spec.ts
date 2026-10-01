import { type Booking, type Master, type MasterService, type ScheduleTemplate } from './models';
import {
  bookingConflicts,
  distanceKm,
  editDistance,
  expectedRevenue,
  formatDistance,
  marketPriceRange,
  matchMaster,
  minPrice,
  onePerStart,
  pendingReleaseAt,
  slotStatusFor,
  templateError,
  templateTimes,
  toHhmm,
  toMinutes,
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
    schedule: {
      workDays: [1, 2, 3, 4, 5],
      from: '10:00',
      to: '19:00',
      slotMinutes: 90,
      breaks: [],
      capacity: 1,
    },
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

  it('ignores add-ons for the headline price', () => {
    const services = [
      ...master({}).services,
      {
        id: 's3',
        subcategoryId: 'manicure-removal',
        price: { kind: 'exact', amount: 8 },
        durationMin: 20,
      },
    ] as const;
    expect(minPrice(services)).toEqual({ kind: 'from', amount: 35 });
    expect(minPrice([services[2]])).toEqual({ kind: 'exact', amount: 8 });
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

  it('gives the master until the start when booked less than 2 h ahead', () => {
    const release = pendingReleaseAt({
      start: '2026-10-10T10:00:00.000Z',
      createdAt: '2026-10-10T09:00:00.000Z',
    });
    expect(release.toISOString()).toBe('2026-10-10T10:00:00.000Z');
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

describe('toMinutes / toHhmm', () => {
  it('converts both ways', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('23:59')).toBe(1439);
    expect(toHhmm(0)).toBe('00:00');
    expect(toHhmm(570)).toBe('09:30');
    expect(toHhmm(1439)).toBe('23:59');
  });
});

describe('templateTimes (ТЗ 6.1)', () => {
  const base = { from: '10:00', to: '14:00', slotMinutes: 60, breaks: [] };

  it('fills the day with back-to-back slots', () => {
    expect(templateTimes(base)).toEqual(['10:00', '11:00', '12:00', '13:00']);
  });

  it('starts the next slot at the break end', () => {
    const times = templateTimes({ ...base, to: '15:00', breaks: [{ from: '12:00', to: '12:30' }] });
    expect(times).toEqual(['10:00', '11:00', '12:30', '13:30']);
  });

  it('drops a slot that would run into the break', () => {
    const times = templateTimes({
      from: '10:00',
      to: '15:00',
      slotMinutes: 90,
      breaks: [{ from: '11:00', to: '12:00' }],
    });
    expect(times).toEqual(['12:00', '13:30']);
  });

  it('is empty when nothing fits', () => {
    expect(templateTimes({ ...base, slotMinutes: 300 })).toEqual([]);
    expect(templateTimes({ ...base, breaks: [{ from: '10:00', to: '14:00' }] })).toEqual([]);
  });
});

describe('templateError', () => {
  const valid: ScheduleTemplate = {
    workDays: [1, 2, 3],
    from: '10:00',
    to: '18:00',
    slotMinutes: 60,
    breaks: [{ from: '13:00', to: '14:00' }],
    capacity: 1,
  };
  const END = 'Конец рабочего дня должен быть позже начала';
  const CAPACITY = 'Одновременно можно принимать от 1 до 5 клиентов';

  it('is null for a valid template', () => {
    expect(templateError(valid)).toBeNull();
  });

  it.each<[string, Partial<ScheduleTemplate>, string]>([
    ['no work days', { workDays: [] }, 'Выберите хотя бы один рабочий день'],
    ['end before start', { from: '18:00', to: '10:00' }, END],
    ['end equals start', { from: '10:00', to: '10:00' }, END],
    [
      'break end not after start',
      { breaks: [{ from: '14:00', to: '13:00' }] },
      'Перерыв должен заканчиваться позже начала',
    ],
    [
      'break outside hours',
      { breaks: [{ from: '09:00', to: '10:30' }] },
      'Перерыв должен быть внутри рабочего дня',
    ],
    ['capacity 0', { capacity: 0 }, CAPACITY],
    ['capacity 6', { capacity: 6 }, CAPACITY],
    ['nothing fits', { slotMinutes: 600 }, 'В рабочий день не помещается ни одна процедура'],
  ])('rejects %s', (_name, patch, message) => {
    expect(templateError({ ...valid, ...patch })).toBe(message);
  });

  it('accepts the capacity boundaries 1 and 5', () => {
    expect(templateError({ ...valid, capacity: 1 })).toBeNull();
    expect(templateError({ ...valid, capacity: 5 })).toBeNull();
  });
});

describe('expectedRevenue (ТЗ 7.3)', () => {
  const service = (subcategoryId: string, price: MasterService['price']): MasterService => ({
    id: subcategoryId,
    subcategoryId,
    price,
    durationMin: 60,
  });
  const book = (subcategoryId: string, amount: number, n: number) =>
    Array.from({ length: n }, () => ({
      subcategoryId,
      price: { kind: 'exact', amount } as const,
    }));

  it('sums count x current price per service, sorted by total desc', () => {
    const lines = expectedRevenue(
      [...book('a', 30, 3), ...book('b', 50, 5)],
      [service('a', { kind: 'exact', amount: 30 }), service('b', { kind: 'exact', amount: 50 })],
    );
    expect(lines).toEqual([
      { subcategoryId: 'b', count: 5, price: 50, total: 250 },
      { subcategoryId: 'a', count: 3, price: 30, total: 90 },
    ]);
    expect(lines.reduce((sum, l) => sum + l.total, 0)).toBe(340);
  });

  it('uses the current service price, not the booked one', () => {
    const lines = expectedRevenue(book('a', 20, 2), [service('a', { kind: 'exact', amount: 45 })]);
    expect(lines[0]).toMatchObject({ price: 45, total: 90 });
  });

  it('counts a «from» price as its amount and free as 0', () => {
    const lines = expectedRevenue(
      [...book('a', 1, 2), ...book('b', 1, 4)],
      [service('a', { kind: 'from', amount: 35 }), service('b', { kind: 'free' })],
    );
    expect(lines.find((l) => l.subcategoryId === 'a')?.total).toBe(70);
    expect(lines.find((l) => l.subcategoryId === 'b')?.total).toBe(0);
  });

  it('falls back to the booked price when the service was removed', () => {
    const lines = expectedRevenue(book('gone', 40, 2), []);
    expect(lines).toEqual([{ subcategoryId: 'gone', count: 2, price: 40, total: 80 }]);
  });

  it('is empty without bookings', () => {
    expect(expectedRevenue([], [])).toEqual([]);
  });
});

describe('onePerStart', () => {
  it('keeps one slot per start, preferring a free one, in order', () => {
    const slots = [
      { id: 1, start: 'T1', status: 'booked' as const },
      { id: 2, start: 'T1', status: 'free' as const },
      { id: 3, start: 'T2', status: 'free' as const },
      { id: 4, start: 'T2', status: 'busy' as const },
      { id: 5, start: 'T3', status: 'busy' as const },
    ];
    expect(onePerStart(slots).map((s) => s.id)).toEqual([2, 3, 5]);
  });

  it('returns an empty list for no slots', () => {
    expect(onePerStart([])).toEqual([]);
  });
});
