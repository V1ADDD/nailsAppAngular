// Pure schedule / profile / client-search logic for the master cabinet (ТЗ 4.1, 6.2, 7.2).
import { type BookingView, type CabinetClient, type StatsPeriod } from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import { fuzzyIncludes, normalize, toMinutes } from '@app/core/data/rules';
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
  /** First bookings of the day for the desktop month grid. */
  items: ScheduleRow[];
  more: number;
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
      const taken = rows.filter((r) => r.status !== 'free');
      week.push({
        items: taken.slice(0, MONTH_ITEMS),
        more: Math.max(0, taken.length - MONTH_ITEMS),
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

const MONTH_ITEMS = 3;

/** 90 → «1 ч 30 мин», 45 → «45 мин». */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} мин`;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** [1, 2, 3, 4, 5, 7] → «Пн–Пт, Вс». */
export function workDaysLabel(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    const from = WEEKDAY_SHORT[sorted[i]! - 1]!;
    const to = WEEKDAY_SHORT[sorted[j]! - 1]!;
    parts.push(j - i >= 2 ? `${from}–${to}` : j > i ? `${from}, ${to}` : from);
    i = j + 1;
  }
  return parts.join(', ') || 'Нет рабочих дней';
}

const startMinutes = (iso: string) => toMinutes(fmt(iso, 'HH:mm'));
const endOf = (row: ScheduleRow) => new Date(row.start).getTime() + row.durationMin * 60_000;

// ── Day agenda (mobile): bookings + free time collapsed into ranges ───────────

/** A free start time; `places` > 1 when the master takes several clients at once. */
export interface FreeChip {
  row: ScheduleRow;
  places: number;
}

export type AgendaItem =
  | { kind: 'booking'; id: string; row: ScheduleRow }
  | { kind: 'free'; id: string; start: string; end: string; chips: FreeChip[] };

/**
 * Turns a day of rows into an agenda: every booking is its own item, and runs of free
 * slots between them collapse into one «Свободно 10:00–13:00» item with time chips, so a
 * 15-minute grid doesn't become a hundred rows.
 */
export function buildAgenda(rows: readonly ScheduleRow[]): AgendaItem[] {
  const items: AgendaItem[] = [];
  let range: Extract<AgendaItem, { kind: 'free' }> | null = null;
  for (const row of rows) {
    if (row.status !== 'free') {
      items.push({ kind: 'booking', id: row.id, row });
      range = null;
      continue;
    }
    const end = new Date(endOf(row)).toISOString();
    // A gap (a break, an off-grid manual slot) starts a new range.
    if (!range || new Date(row.start).getTime() > new Date(range.end).getTime()) {
      range = { kind: 'free', id: `free-${row.id}`, start: row.start, end, chips: [] };
      items.push(range);
    }
    const same = range.chips.find((c) => c.row.start === row.start);
    if (same) same.places++;
    else range.chips.push({ row, places: 1 });
    if (end > range.end) range.end = end;
  }
  return items;
}

// ── Time grid (md+): Google-Calendar-like day / week columns ──────────────────

export interface GridBlock {
  row: ScheduleRow;
  /** Minutes from the top of the grid. */
  top: number;
  height: number;
  /** Side-by-side lanes for overlapping bookings (capacity > 1). */
  lane: number;
  lanes: number;
  places: number;
}

export interface GridDay {
  key: string;
  bookings: GridBlock[];
  free: GridBlock[];
}

export interface GridBounds {
  /** Minutes since midnight, whole hours. */
  from: number;
  to: number;
}

/** Visible hours: the working day, widened to fit every row, whole hours. */
export function gridBounds(
  days: readonly ScheduleDay[],
  work: { from: string; to: string },
): GridBounds {
  let from = toMinutes(work.from);
  let to = toMinutes(work.to);
  for (const day of days) {
    for (const row of day.rows) {
      const start = startMinutes(row.start);
      from = Math.min(from, start);
      to = Math.max(to, Math.min(24 * 60, start + row.durationMin));
    }
  }
  return { from: Math.floor(from / 60) * 60, to: Math.min(24 * 60, Math.ceil(to / 60) * 60) };
}

export function layoutGridDay(day: ScheduleDay, bounds: GridBounds): GridDay {
  const block = (row: ScheduleRow): GridBlock => ({
    row,
    top: startMinutes(row.start) - bounds.from,
    height: row.durationMin,
    lane: 0,
    lanes: 1,
    places: 1,
  });

  const free: GridBlock[] = [];
  for (const row of day.rows.filter((r) => r.status === 'free')) {
    const same = free.find((b) => b.row.start === row.start);
    if (same) same.places++;
    else free.push(block(row));
  }

  // Greedy lanes inside clusters of overlapping bookings.
  const bookings = day.rows.filter((r) => r.status !== 'free').map(block);
  let cluster: GridBlock[] = [];
  let clusterEnd = -1;
  const laneEnds: number[] = [];
  const close = () => {
    for (const b of cluster) b.lanes = laneEnds.length;
    cluster = [];
    laneEnds.length = 0;
  };
  for (const b of bookings) {
    if (b.top >= clusterEnd) close();
    let lane = laneEnds.findIndex((end) => end <= b.top);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = b.top + b.height;
    b.lane = lane;
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.top + b.height);
  }
  close();
  return { key: day.key, bookings, free };
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
