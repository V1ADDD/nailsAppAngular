import { type BookingView, type CabinetClient } from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import {
  addDaysToKey,
  buildMonth,
  buildRows,
  byNearestBooking,
  buildWeek,
  groupByDay,
  matchClient,
  minskIso,
  neighbourPeriod,
  periodCaption,
  profileCompleteness,
  shiftDate,
  weekStart,
  weekdayOf,
} from './schedule-logic';

const NOW = new Date('2026-08-27T09:00:00.000Z'); // Thu 27 Aug, 12:00 Minsk

function slot(partial: Partial<Slot> & Pick<Slot, 'id' | 'start'>): Slot {
  return {
    masterId: 'm1',
    durationMin: 60,
    status: 'free',
    bookingId: null,
    ...partial,
  };
}

function booking(partial: Partial<BookingView> & Pick<BookingView, 'id' | 'start'>): BookingView {
  return {
    masterId: 'm1',
    clientId: 'c1',
    subcategoryId: 'manicure-classic',
    price: { kind: 'exact', amount: 40 },
    durationMin: 60,
    address: 'ул. Ленина, 42',
    status: 'confirmed',
    source: 'site',
    createdBy: 'client',
    createdAt: '2026-08-20T10:00:00.000Z',
    slotId: null,
    chatId: null,
    masterName: 'Анна Серова',
    masterPhotoUrl: null,
    clientName: 'Алина К.',
    clientPhotoUrl: null,
    serviceName: 'Маникюр',
    releaseAt: null,
    ...partial,
  };
}

describe('day keys', () => {
  it('adds days across month boundaries', () => {
    expect(addDaysToKey('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('finds ISO weekdays and the Monday of the week', () => {
    expect(weekdayOf('2026-08-27')).toBe(4);
    expect(weekdayOf('2026-08-30')).toBe(7);
    expect(weekStart('2026-08-30')).toBe('2026-08-24');
  });

  it('shifts by day, week and month (clamping the day)', () => {
    expect(shiftDate('2026-08-27', 'day', 1)).toBe('2026-08-28');
    expect(shiftDate('2026-08-27', 'week', -1)).toBe('2026-08-20');
    expect(shiftDate('2026-01-31', 'month', 1)).toBe('2026-02-28');
  });

  it('switches periods for swipes without wrapping', () => {
    expect(neighbourPeriod('day', 1)).toBe('week');
    expect(neighbourPeriod('month', 1)).toBe('month');
    expect(neighbourPeriod('day', -1)).toBe('day');
  });

  it('builds captions', () => {
    expect(periodCaption('2026-08-27', 'day', '2026-08-27')).toBe('Сегодня, 27 авг');
    expect(periodCaption('2026-08-28', 'day', '2026-08-27')).toBe('Завтра, 28 авг');
    expect(periodCaption('2026-08-27', 'week', '2026-08-27')).toBe('24 авг – 30 авг');
  });

  it('converts Minsk wall time to ISO', () => {
    expect(minskIso('2026-08-27', '09:30')).toBe('2026-08-27T06:30:00.000Z');
  });
});

describe('buildRows (ТЗ 6.2 statuses)', () => {
  const slots = [
    slot({ id: 's-free', start: '2026-08-27T10:00:00.000Z' }),
    slot({
      id: 's-booked',
      start: '2026-08-27T06:00:00.000Z',
      status: 'booked',
      bookingId: 'b-site',
    }),
    slot({ id: 's-busy', start: '2026-08-27T12:00:00.000Z', status: 'busy', bookingId: 'b-ext' }),
    slot({
      id: 's-pending',
      start: '2026-08-28T07:00:00.000Z',
      status: 'pending',
      bookingId: 'b-pending',
    }),
  ];
  const bookings = [
    booking({ id: 'b-site', start: '2026-08-27T06:00:00.000Z' }),
    booking({
      id: 'b-ext',
      start: '2026-08-27T12:00:00.000Z',
      source: 'external',
      clientId: null,
      createdBy: 'master',
    }),
    booking({ id: 'b-pending', start: '2026-08-28T07:00:00.000Z', status: 'pending' }),
    booking({ id: 'b-past', start: '2026-08-20T07:00:00.000Z', status: 'completed' }),
    booking({ id: 'b-cancelled', start: '2026-08-21T07:00:00.000Z', status: 'cancelled' }),
  ];
  const rows = buildRows(slots, bookings, NOW);

  it('labels each status and sorts by start', () => {
    expect(rows.map((r) => [r.id, r.status, r.label])).toEqual([
      ['b-past', 'completed', 'Пришла'],
      ['s-booked', 'booked', 'Бронь на сайте'],
      ['s-free', 'free', 'Свободно'],
      ['s-busy', 'busy', 'Занято · не с сайта'],
      ['s-pending', 'pending', 'Ожидает подтверждения'],
    ]);
  });

  it('marks past rows and skips cancelled bookings', () => {
    expect(rows.find((r) => r.id === 's-booked')?.past).toBe(true);
    expect(rows.find((r) => r.id === 's-pending')?.past).toBe(false);
    expect(rows.some((r) => r.booking?.id === 'b-cancelled')).toBe(false);
  });

  it('groups into Minsk days, weeks and a month grid', () => {
    const byDay = groupByDay(rows);
    expect(byDay.get('2026-08-27')?.length).toBe(3);

    const week = buildWeek(byDay, '2026-08-27');
    expect(week.map((d) => d.key)).toEqual([
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
      '2026-08-29',
      '2026-08-30',
    ]);

    const month = buildMonth(byDay, '2026-08-27', '2026-08-27');
    expect(month[0]![0]!.key).toBe('2026-07-27');
    expect(month.every((w) => w.length === 7)).toBe(true);
    const today = month.flat().find((c) => c.key === '2026-08-27')!;
    expect(today).toMatchObject({ isToday: true, inMonth: true, free: 1, taken: 2, pending: 0 });
    expect(month.flat().find((c) => c.key === '2026-08-28')?.pending).toBe(1);
  });
});

describe('profileCompleteness (ТЗ 4.1)', () => {
  const base = {
    photoUrl: null,
    about: '',
    portfolio: [],
    courses: [],
    contacts: { phone: '+375', email: 'a@b.by' },
    address: 'ул. Ленина, 42',
  } as unknown as Master;

  it('lists missing fields', () => {
    expect(profileCompleteness(base)).toEqual({
      percent: 17,
      missing: ['фото', 'о себе', 'портфолио', 'курсы', 'контакты'],
    });
  });

  it('is 100% when everything is filled', () => {
    const full = {
      ...base,
      photoUrl: 'x.jpg',
      about: 'Опыт 5 лет',
      portfolio: [{ id: 'p', url: null, hue: 1 }],
      courses: [{ title: 'Курс', school: 'Школа', year: 2020 }],
      contacts: { ...base.contacts, telegram: '@anna' },
    } as Master;
    expect(profileCompleteness(full)).toEqual({ percent: 100, missing: [] });
  });
});

describe('matchClient (ТЗ 7.4)', () => {
  const entry: CabinetClient = {
    client: {
      id: 'c1',
      name: 'Алина Ковалёва',
      photoUrl: null,
      phone: '+375 29 111-22-33',
      email: 'a@b.by',
      preferredContact: 'messages',
    },
    nextBooking: booking({ id: 'b1', start: '2026-08-28T07:30:00.000Z' }), // 28 авг 10:30
    lastBooking: null,
    visits: 3,
    services: ['Классический маникюр'],
    reviews: [],
  };

  it.each(['алина', 'Ковалева', 'маникюр', '28 авг', '28 августа', '10:30', 'алина 28 авг', ''])(
    'matches «%s»',
    (query) => expect(matchClient(entry, query)).toBe(true),
  );

  it.each(['марина', '29 авг', '11:00'])('does not match «%s»', (query) =>
    expect(matchClient(entry, query)).toBe(false),
  );
});

describe('byNearestBooking (ТЗ 7.4)', () => {
  it('puts the nearest booking first and clients without one last', () => {
    const c = (id: string, start?: string) =>
      ({ client: { id }, nextBooking: start ? { start } : null }) as unknown as CabinetClient;
    const sorted = [c('none'), c('late', '2026-09-02T07:00:00Z'), c('soon', '2026-08-28T07:00:00Z')]
      .sort(byNearestBooking)
      .map((x) => x.client.id);
    expect(sorted).toEqual(['soon', 'late', 'none']);
  });
});
