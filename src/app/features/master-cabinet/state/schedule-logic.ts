// Pure schedule / profile / client-search logic for the master cabinet (ТЗ 4.1, 6.2, 7.2).
import { type BookingView, type CabinetClient, type StatsPeriod } from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import { fuzzyIncludes, normalize } from '@app/core/data/rules';
import { dayKey, fmt } from '@app/shared/format/dates';

export type SchedulePeriod = StatsPeriod;

export const PERIODS: readonly SchedulePeriod[] = ['day', 'week', 'month'];

/** ТЗ 6.2 master statuses, plus the outcome of past bookings. */
export type RowStatus = 'free' | 'pending' | 'booked' | 'busy' | 'completed' | 'no-show';

export const ROW_STATUS_LABEL: Record<RowStatus, string> = {
  free: 'Свободно',
  pending: 'Ожидает подтверждения',
  booked: 'Бронь на сайте',
  busy: 'Занято · не с сайта',
  completed: 'Пришла',
  'no-show': 'Не пришла',
};

export interface ScheduleRow {
  id: string;
  start: string;
  durationMin: number;
  status: RowStatus;
  label: string;
  slot: Slot | null;
  booking: BookingView | null;
  /** Start is in the past (for «Не пришла»). */
  past: boolean;
}

export interface ScheduleDay {
  key: string;
  rows: ScheduleRow[];
}

export interface MonthCell {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  free: number;
  taken: number;
  pending: number;
}

// ── Day keys ('yyyy-MM-dd', Minsk calendar) ───────────────────────────────────

function keyToUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToKey(key: string, days: number): string {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToKey(d);
}

/** ISO weekday of a day key, 1 = Monday … 7 = Sunday. */
export function weekdayOf(key: string): number {
  const day = keyToUtc(key).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekStart(key: string): string {
  return addDaysToKey(key, 1 - weekdayOf(key));
}

/** A Date at Minsk noon of the key, safe for formatting with `fmt`. */
export function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00+03:00`);
}

/** Moves the schedule date by one period (arrows). */
export function shiftDate(key: string, period: SchedulePeriod, step: number): string {
  if (period === 'day') return addDaysToKey(key, step);
  if (period === 'week') return addDaysToKey(key, step * 7);
  const d = keyToUtc(key);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + step, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return utcToKey(target);
}

/** The neighbouring tab for swipes: left → next (день → неделя → месяц). */
export function neighbourPeriod(period: SchedulePeriod, step: number): SchedulePeriod {
  const index = PERIODS.indexOf(period) + step;
  return PERIODS[Math.max(0, Math.min(PERIODS.length - 1, index))]!;
}

/** «Сегодня, 27 авг», «Пн, 24 авг – вс, 30 авг», «Август 2026». */
export function periodCaption(key: string, period: SchedulePeriod, todayKey: string): string {
  const date = keyToDate(key);
  if (period === 'day') {
    const prefix =
      key === todayKey
        ? 'Сегодня'
        : key === addDaysToKey(todayKey, 1)
          ? 'Завтра'
          : fmt(date, 'EEEEEE');
    return `${prefix}, ${fmt(date, 'd MMM')}`;
  }
  if (period === 'week') {
    const start = weekStart(key);
    const end = addDaysToKey(start, 6);
    return `${fmt(keyToDate(start), 'd MMM')} – ${fmt(keyToDate(end), 'd MMM')}`;
  }
  return fmt(date, 'LLLL y');
}

// ── Rows ──────────────────────────────────────────────────────────────────────

function rowStatus(slot: Slot | null, booking: BookingView | null): RowStatus {
  if (!booking) return slot?.status === 'free' || !slot ? 'free' : slot.status;
  if (booking.status === 'completed') return 'completed';
  if (booking.status === 'no-show') return 'no-show';
  if (booking.status === 'pending') return 'pending';
  return booking.source === 'external' ? 'busy' : 'booked';
}

/**
 * Joins slots with their bookings (ТЗ 6.2). Active bookings without a slot in the list
 * (past visits) still show up; cancelled bookings don't occupy the schedule.
 */
export function buildRows(
  slots: readonly Slot[],
  bookings: readonly BookingView[],
  now: Date = new Date(),
): ScheduleRow[] {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const used = new Set<string>();
  const rows: ScheduleRow[] = slots.map((slot) => {
    const found = slot.bookingId ? byId.get(slot.bookingId) : undefined;
    const booking = found && found.status !== 'cancelled' ? found : null;
    if (booking) used.add(booking.id);
    const status = rowStatus(slot, booking);
    return {
      id: slot.id,
      start: slot.start,
      durationMin: slot.durationMin,
      status,
      label: ROW_STATUS_LABEL[status],
      slot,
      booking,
      past: new Date(slot.start) < now,
    };
  });
  for (const booking of bookings) {
    if (used.has(booking.id) || booking.status === 'cancelled') continue;
    const status = rowStatus(null, booking);
    rows.push({
      id: booking.id,
      start: booking.start,
      durationMin: booking.durationMin,
      status,
      label: ROW_STATUS_LABEL[status],
      slot: null,
      booking,
      past: new Date(booking.start) < now,
    });
  }
  return rows.sort((a, b) => a.start.localeCompare(b.start));
}

export function groupByDay(rows: readonly ScheduleRow[]): Map<string, ScheduleRow[]> {
  const map = new Map<string, ScheduleRow[]>();
  for (const row of rows) {
    const key = dayKey(row.start);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export function buildDay(byDay: Map<string, ScheduleRow[]>, key: string): ScheduleDay {
  return { key, rows: byDay.get(key) ?? [] };
}

export function buildWeek(byDay: Map<string, ScheduleRow[]>, key: string): ScheduleDay[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => buildDay(byDay, addDaysToKey(start, i)));
}

/** Calendar grid Monday-first, whole weeks covering the month of `key`. */
export function buildMonth(
  byDay: Map<string, ScheduleRow[]>,
  key: string,
  todayKey: string,
): MonthCell[][] {
  const month = key.slice(0, 7);
  const first = `${month}-01`;
  let cursor = weekStart(first);
  const weeks: MonthCell[][] = [];
  while (weeks.length === 0 || cursor.slice(0, 7) === month) {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      const rows = byDay.get(cursor) ?? [];
      week.push({
        key: cursor,
        day: Number(cursor.slice(8)),
        inMonth: cursor.slice(0, 7) === month,
        isToday: cursor === todayKey,
        free: rows.filter((r) => r.status === 'free').length,
        pending: rows.filter((r) => r.status === 'pending').length,
        taken: rows.filter((r) => r.status !== 'free' && r.status !== 'pending').length,
      });
      cursor = addDaysToKey(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// ── Profile completeness (ТЗ 4.1 «Заполните профиль — будете популярнее») ─────

export interface Completeness {
  percent: number;
  missing: string[];
}

export function profileCompleteness(master: Master): Completeness {
  const checks: [boolean, string][] = [
    [!!master.photoUrl, 'фото'],
    [master.about.trim().length > 0, 'о себе'],
    [master.portfolio.length > 0, 'портфолио'],
    [master.courses.length > 0, 'курсы'],
    [
      !!(master.contacts.telegram || master.contacts.viber || master.contacts.instagram),
      'контакты',
    ],
    [master.address.trim().length > 0, 'адрес'],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([ok]) => !ok).map(([, label]) => label),
  };
}

// ── Client search (ТЗ 7.4: по имени, услуге, дате, времени) ───────────────────

function bookingWords(booking: BookingView | null): string[] {
  if (!booking) return [];
  return [
    fmt(booking.start, 'd MMM'),
    fmt(booking.start, 'd MMMM'),
    fmt(booking.start, 'dd.MM'),
    fmt(booking.start, 'HH:mm'),
    booking.serviceName,
  ];
}

/**
 * A client matches when the whole query is found in one field (phone, «28 авг», «10:30»),
 * or every query word starts a word of the name / services / booking dates, or the name
 * matches with a typo.
 */
export function matchClient(entry: CabinetClient, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const fields = [
    entry.client.name,
    entry.client.phone,
    ...entry.services,
    ...bookingWords(entry.nextBooking),
    ...bookingWords(entry.lastBooking),
  ].map(normalize);
  if (fields.some((field) => field.includes(q))) return true;
  const words = fields
    .filter((_, i) => i !== 1) // phone digits only match as a whole
    .join(' ')
    .split(' ');
  return (
    q.split(' ').every((part) => words.some((word) => word.startsWith(part))) ||
    fuzzyIncludes(entry.client.name, q)
  );
}

/** Minsk wall time → ISO timestamp: ('2026-08-27', '09:30') → '2026-08-27T06:30:00.000Z'. */
export function minskIso(key: string, time: string): string {
  return new Date(`${key}T${time}:00+03:00`).toISOString();
}

/** ТЗ 7.4: nearest upcoming booking first; clients without one go last. */
export function byNearestBooking(a: CabinetClient, b: CabinetClient): number {
  const x = a.nextBooking?.start;
  const y = b.nextBooking?.start;
  if (x && y) return x < y ? -1 : x > y ? 1 : 0;
  return x ? -1 : y ? 1 : 0;
}
