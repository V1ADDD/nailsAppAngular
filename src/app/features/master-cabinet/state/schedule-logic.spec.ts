import { type BookingView, type CabinetClient } from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import {
  addDaysToKey,
  buildAgenda,
  buildBookingList,
  buildMonth,
  buildRows,
  byNearestBooking,
  durationLabel,
  gridBounds,
  layoutGridDay,
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
  workDaysLabel,
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

const t = (hhmm: string) => minskIso('2026-08-28', hhmm);

describe('buildAgenda', () => {
  const free = (id: string, start: string, durationMin = 60) =>
    buildRows([slot({ id, start, durationMin })], [], NOW)[0]!;
  const booked = (id: string, start: string) =>
    buildRows(
      [slot({ id, start, status: 'booked', bookingId: `b-${id}` })],
      [booking({ id: `b-${id}`, start })],
      NOW,
    )[0]!;

  it('makes every booking its own item', () => {
    const items = buildAgenda([booked('s1', t('10:00'))]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'booking', id: 's1' });
  });

  it('merges consecutive free rows into one range', () => {
    const items = buildAgenda([
      free('a', t('10:00')),
      free('b', t('11:00')),
      free('c', t('12:00')),
    ]);
    expect(items).toHaveLength(1);
    const range = items[0]!;
    if (range.kind !== 'free') throw new Error('expected free range');
    expect(range.start).toBe(t('10:00'));
    expect(range.end).toBe(t('13:00'));
    expect(range.chips.map((c) => c.row.id)).toEqual(['a', 'b', 'c']);
  });

  it('starts a new range after a gap such as a lunch break', () => {
    const items = buildAgenda([free('a', t('12:00')), free('b', t('14:00'))]);
    expect(items.map((i) => (i.kind === 'free' ? [i.start, i.end] : null))).toEqual([
      [t('12:00'), t('13:00')],
      [t('14:00'), t('15:00')],
    ]);
  });

  it('collapses parallel free slots at the same start into one chip with places', () => {
    const items = buildAgenda([
      free('a', t('10:00')),
      free('b', t('10:00')),
      free('c', t('11:00')),
    ]);
    const range = items[0]!;
    if (range.kind !== 'free') throw new Error('expected free range');
    expect(range.chips.map((c) => [c.row.id, c.places])).toEqual([
      ['a', 2],
      ['c', 1],
    ]);
  });

  it('splits ranges around a booking', () => {
    const items = buildAgenda([
      free('a', t('10:00')),
      booked('s', t('11:00')),
      free('c', t('12:00')),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['free', 'booking', 'free']);
  });

  it('is empty for no rows', () => {
    expect(buildAgenda([])).toEqual([]);
  });
});

describe('time grid', () => {
  const rowsOf = (...specs: [string, string, 'free' | 'booked', number?][]) => {
    const slots = specs.map(([id, time, status, dur]) =>
      slot({
        id,
        start: t(time),
        durationMin: dur ?? 60,
        status,
        bookingId: status === 'booked' ? `b-${id}` : null,
      }),
    );
    const bookings = specs
      .filter(([, , status]) => status === 'booked')
      .map(([id, time, , dur]) =>
        booking({ id: `b-${id}`, start: t(time), durationMin: dur ?? 60 }),
      );
    return buildRows(slots, bookings, NOW);
  };
  const work = { from: '10:00', to: '19:00' };

  it('uses the working day in whole hours when rows fit', () => {
    expect(gridBounds([{ key: '2026-08-28', rows: [] }], work)).toEqual({ from: 600, to: 1140 });
  });

  it('widens bounds to fit rows outside the working day', () => {
    const early = { key: '2026-08-28', rows: rowsOf(['a', '08:30', 'free']) };
    expect(gridBounds([early], work)).toEqual({ from: 480, to: 1140 });
    const late = { key: '2026-08-28', rows: rowsOf(['z', '19:30', 'free', 90]) };
    expect(gridBounds([late], work)).toEqual({ from: 600, to: 1260 });
  });

  it('positions blocks in minutes from the top of the grid', () => {
    const rows = rowsOf(['a', '10:30', 'booked', 45]);
    const grid = layoutGridDay({ key: '2026-08-28', rows }, { from: 600, to: 1140 });
    expect(grid.bookings[0]).toMatchObject({ top: 30, height: 45, lane: 0, lanes: 1 });
  });

  it('puts overlapping bookings in separate lanes', () => {
    const rows = rowsOf(
      ['a', '10:00', 'booked'],
      ['b', '10:30', 'booked'],
      ['c', '13:00', 'booked'],
    );
    const grid = layoutGridDay({ key: '2026-08-28', rows }, { from: 600, to: 1140 });
    const byId = Object.fromEntries(grid.bookings.map((b) => [b.row.id, b]));
    expect(byId['a']).toMatchObject({ lane: 0, lanes: 2 });
    expect(byId['b']).toMatchObject({ lane: 1, lanes: 2 });
    expect(byId['c']).toMatchObject({ lane: 0, lanes: 1 });
  });

  it('dedupes parallel free slots into places', () => {
    const rows = rowsOf(['a', '10:00', 'free'], ['b', '10:00', 'free'], ['c', '11:00', 'free']);
    const grid = layoutGridDay({ key: '2026-08-28', rows }, { from: 600, to: 1140 });
    expect(grid.free.map((b) => [b.row.id, b.places])).toEqual([
      ['a', 2],
      ['c', 1],
    ]);
    expect(grid.bookings).toEqual([]);
  });
});

describe('workDaysLabel', () => {
  it.each([
    [[1, 2, 3, 4, 5], 'Пн–Пт'],
    [[1, 2, 3, 4, 5, 7], 'Пн–Пт, Вс'],
    [[1, 2], 'Пн, Вт'],
    [[7, 1, 3], 'Пн, Ср, Вс'],
    [[], 'Нет рабочих дней'],
  ])('labels %j as «%s»', (days, label) => expect(workDaysLabel(days)).toBe(label));
});

describe('durationLabel', () => {
  it.each([
    [45, '45 мин'],
    [60, '1 ч'],
    [90, '1 ч 30 мин'],
  ])('formats %i minutes', (minutes, label) => expect(durationLabel(minutes)).toBe(label));
});

describe('buildMonth items and more', () => {
  it('lists up to 3 non-free rows per day and counts the rest', () => {
    const day = (hhmm: string) => minskIso('2026-08-27', hhmm);
    const times = ['09:00', '10:00', '11:00', '12:00', '13:00'];
    const slots = [
      ...times.map((time, i) =>
        slot({ id: `s${i}`, start: day(time), status: 'booked', bookingId: `b${i}` }),
      ),
      slot({ id: 'f', start: day('15:00') }),
    ];
    const bookings = times.map((time, i) => booking({ id: `b${i}`, start: day(time) }));
    const cell = buildMonth(groupByDay(buildRows(slots, bookings, NOW)), '2026-08-27', '2026-08-27')
      .flat()
      .find((c) => c.key === '2026-08-27')!;
    expect(cell.items.map((r) => r.id)).toEqual(['s0', 's1', 's2']);
    expect(cell.more).toBe(2);
    expect(cell.free).toBe(1);
  });

  it('has no items and no overflow on an empty day', () => {
    const cell = buildMonth(new Map(), '2026-08-27', '2026-08-27')
      .flat()
      .find((c) => c.key === '2026-08-10')!;
    expect(cell).toMatchObject({ items: [], more: 0 });
  });
});

describe('buildBookingList', () => {
  const slots = [
    slot({ id: 's-free-future', start: '2026-08-27T15:00:00.000Z' }),
    slot({ id: 's-free-past', start: '2026-08-26T07:00:00.000Z' }),
  ];
  const bookings = [
    booking({ id: 'b-today-late', start: '2026-08-27T14:00:00.000Z' }),
    booking({ id: 'b-today-early', start: '2026-08-27T11:00:00.000Z', status: 'pending' }),
    booking({ id: 'b-sep', start: '2026-09-02T07:00:00.000Z' }),
    booking({ id: 'b-tomorrow', start: '2026-08-28T07:00:00.000Z' }),
    booking({ id: 'b-past-1', start: '2026-08-20T07:00:00.000Z', status: 'completed' }),
    booking({ id: 'b-past-2', start: '2026-08-26T08:00:00.000Z', status: 'no-show' }),
    booking({ id: 'b-past-3', start: '2026-08-26T10:00:00.000Z', status: 'completed' }),
    booking({ id: 'b-old-july', start: '2026-07-30T07:00:00.000Z', status: 'completed' }),
    booking({ id: 'b-cancelled', start: '2026-08-29T07:00:00.000Z', status: 'cancelled' }),
  ];
  const byDay = groupByDay(buildRows(slots, bookings, NOW));

  it('lists upcoming bookings ascending, grouped per day, without free rows', () => {
    const groups = buildBookingList(byDay, 'upcoming', NOW);
    expect(groups.map((g) => g.key)).toEqual(['2026-08-27', '2026-08-28', '2026-09-02']);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['b-today-early', 'b-today-late']);
    expect(groups.flatMap((g) => g.rows).every((r) => r.booking)).toBe(true);
    expect(groups.flatMap((g) => g.rows.map((r) => r.id))).not.toContain('s-free-future');
  });

  it('lists past bookings descending (latest day first, latest row first)', () => {
    const groups = buildBookingList(byDay, 'past', NOW);
    expect(groups.map((g) => g.key)).toEqual(['2026-08-26', '2026-08-20', '2026-07-30']);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['b-past-3', 'b-past-2']);
  });

  it('captions days relative to today and carries the month for dividers', () => {
    const groups = buildBookingList(byDay, 'upcoming', NOW);
    expect(groups.map((g) => g.caption)).toEqual([
      'Сегодня, 27 авг',
      'Завтра, 28 авг',
      'ср, 2 сен',
    ]);
    expect(groups.map((g) => g.month.toLowerCase())).toEqual([
      'август 2026',
      'август 2026',
      'сентябрь 2026',
    ]);
  });

  it('returns an empty list when there are no bookings in the mode', () => {
    expect(buildBookingList(new Map(), 'upcoming', NOW)).toEqual([]);
    const onlyFuture = groupByDay(
      buildRows([], [booking({ id: 'f', start: '2026-09-01T07:00:00.000Z' })], NOW),
    );
    expect(buildBookingList(onlyFuture, 'past', NOW)).toEqual([]);
  });
});
