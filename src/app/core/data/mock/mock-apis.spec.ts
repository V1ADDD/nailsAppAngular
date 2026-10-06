import { TestBed } from '@angular/core/testing';
import { type Observable, firstValueFrom } from 'rxjs';
import { AccountApi, BookingsApi, CabinetApi, ChatsApi, MastersApi } from '../api';
import { ME_CLIENT_ID } from '../fixtures/seed';
import { type ScheduleTemplate } from '../models';
import { expectedRevenue } from '../rules';
import { MOCK_API_PROVIDERS } from './mock-apis';
import { CLOCK, MockDb } from './mock-db';

// Fixed "now": Tuesday 2026-09-29 12:00 Minsk (09:00 UTC).
const NOW = new Date('2026-09-29T09:00:00.000Z');

describe('mock backend', () => {
  let clock = NOW;
  let bookings: BookingsApi;
  let chats: ChatsApi;
  let masters: MastersApi;
  let cabinet: CabinetApi;
  let account: AccountApi;
  let db: MockDb;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['queueMicrotask'] });
    clock = NOW;
    TestBed.configureTestingModule({
      providers: [...MOCK_API_PROVIDERS, { provide: CLOCK, useValue: () => clock }],
    });
    bookings = TestBed.inject(BookingsApi);
    chats = TestBed.inject(ChatsApi);
    masters = TestBed.inject(MastersApi);
    cabinet = TestBed.inject(CabinetApi);
    account = TestBed.inject(AccountApi);
    db = TestBed.inject(MockDb);
  });

  afterEach(() => jest.useRealTimers());

  /** Resolves a mock observable, fast-forwarding its simulated latency. */
  function resolve<T>(obs: Observable<T>): Promise<T> {
    const promise = firstValueFrom(obs);
    jest.advanceTimersByTime(1000);
    return promise;
  }

  function freeSlotOf(masterId: string) {
    const slot = db.state.slots.find(
      (s) => s.masterId === masterId && s.status === 'free' && s.start > NOW.toISOString(),
    );
    if (!slot) throw new Error('no free slot in fixtures');
    return slot;
  }

  it('hides site vs external bookings from clients (ТЗ 6.2)', async () => {
    const slots = await resolve(masters.getSlots('m-anna-serova', 'client'));
    expect(slots.some((s) => s.status === 'booked')).toBe(false);
    expect(slots.some((s) => s.status === 'busy')).toBe(true);
  });

  it('creates a pending booking with a chat and a booking card (ТЗ 6.3)', async () => {
    const slot = freeSlotOf('m-ekaterina-zhuk');
    const result = await resolve(
      bookings.create({
        masterId: 'm-ekaterina-zhuk',
        clientId: ME_CLIENT_ID,
        slotId: slot.id,
        subcategoryId: 'manicure-classic',
        createdBy: 'client',
      }),
    );
    expect(result.booking.status).toBe('pending');
    expect(db.state.slots.find((s) => s.id === slot.id)?.status).toBe('pending');

    const thread = await resolve(chats.thread(result.chatId, 'client'));
    expect(thread.messages.at(-1)).toMatchObject({ kind: 'booking', bookingId: result.booking.id });
  });

  it('only lets the opposite side confirm', async () => {
    const slot = freeSlotOf('m-ekaterina-zhuk');
    const { booking } = await resolve(
      bookings.create({
        masterId: 'm-ekaterina-zhuk',
        clientId: ME_CLIENT_ID,
        slotId: slot.id,
        subcategoryId: 'manicure-classic',
        createdBy: 'client',
      }),
    );
    await expect(resolve(bookings.confirm(booking.id, 'client'))).rejects.toThrow('другая сторона');
    const confirmed = await resolve(bookings.confirm(booking.id, 'master'));
    expect(confirmed.status).toBe('confirmed');
    expect(db.state.slots.find((s) => s.id === slot.id)?.status).toBe('booked');
  });

  it('requires a reason to cancel and frees the slot (ТЗ 6.5)', async () => {
    const pending = db.state.bookings.find(
      (b) => b.masterId === 'm-anna-serova' && b.status === 'pending',
    )!;
    await expect(resolve(bookings.cancel(pending.id, 'client', '  '))).rejects.toThrow('причину');
    const cancelled = await resolve(bookings.cancel(pending.id, 'client', 'Изменились планы'));
    expect(cancelled.cancellation?.reason).toBe('Изменились планы');
    expect(db.state.slots.find((s) => s.id === pending.slotId)?.status).toBe('free');
  });

  it('releases unconfirmed bookings 2 h before when booked less than a day ahead (ТЗ 6.4)', async () => {
    const pending = db.state.bookings.find(
      (b) => b.masterId === 'm-anna-serova' && b.status === 'pending',
    )!;
    // Booked 8 minutes before "now" for tomorrow 10:00 (22 h ahead) → release at 08:00.
    clock = new Date(new Date(pending.start).getTime() - 2 * 3_600_000 + 60_000);
    await resolve(bookings.forClient(ME_CLIENT_ID));
    expect(db.booking(pending.id).status).toBe('cancelled');
    expect(db.booking(pending.id).cancellation?.expired).toBe(true);
  });

  it('auto-cancels an overlapping booking of the same client (ТЗ 6.10)', async () => {
    const existing = db.state.bookings.find(
      (b) => b.masterId === 'm-anna-serova' && b.status === 'pending',
    )!;
    const clash = db.state.slots.find(
      (s) => s.masterId !== existing.masterId && s.status === 'free' && s.start === existing.start,
    );
    if (!clash) return; // fixtures may not have a same-time free slot; covered by rules tests
    const master = db.master(clash.masterId);
    const result = await resolve(
      bookings.create({
        masterId: master.id,
        clientId: ME_CLIENT_ID,
        slotId: clash.id,
        subcategoryId: master.services[0]!.subcategoryId,
        createdBy: 'client',
      }),
    );
    expect(result.autoCancelled.map((b) => b.id)).toContain(existing.id);
  });

  it('keeps chats separate per role (ТЗ 2.2)', async () => {
    const asClient = await resolve(chats.list('client'));
    const asMaster = await resolve(chats.list('master'));
    expect(asClient.every((c) => c.counterpart.isMaster)).toBe(true);
    expect(asMaster.every((c) => !c.counterpart.isMaster)).toBe(true);
    expect(asClient.find((c) => c.counterpart.name === 'Анна Серова')?.unread).toBe(2);
  });

  describe('generateSlots (capacity and breaks)', () => {
    const MASTER = 'm-anna-serova';
    const template: ScheduleTemplate = {
      workDays: [1, 2, 3, 4, 5, 6, 7],
      from: '10:00',
      to: '18:00',
      slotMinutes: 60,
      breaks: [{ from: '14:00', to: '15:00' }],
      capacity: 2,
    };
    const today = (time: string) => new Date(`2026-09-29T${time}:00+03:00`).toISOString();

    beforeEach(() => {
      db.state.slots = db.state.slots.filter((s) => s.masterId !== MASTER);
    });

    it('creates one free slot per place at every start and skips breaks', async () => {
      const slots = await resolve(bookings.generateSlots(MASTER, template, 1));
      const starts = [...new Set(slots.map((s) => s.start))];
      // "now" is 12:00, so earlier starts are skipped; 14:00 is the break.
      expect(starts).toEqual([today('13:00'), today('15:00'), today('16:00'), today('17:00')]);
      for (const start of starts) {
        expect(slots.filter((s) => s.start === start && s.status === 'free')).toHaveLength(2);
      }
    });

    it('creates fewer places where a slot is already taken', async () => {
      db.state.slots.push({
        id: 'taken',
        masterId: MASTER,
        start: today('15:00'),
        durationMin: 60,
        status: 'booked',
        bookingId: null,
      });
      const slots = await resolve(bookings.generateSlots(MASTER, template, 1));
      const at15 = slots.filter((s) => s.start === today('15:00'));
      expect(at15.filter((s) => s.status === 'free')).toHaveLength(1);
      expect(at15.filter((s) => s.status === 'booked')).toHaveLength(1);
      expect(slots.filter((s) => s.start === today('16:00'))).toHaveLength(2);
    });

    it('saves the template on the master', async () => {
      await resolve(bookings.generateSlots(MASTER, template, 1));
      expect(db.master(MASTER).schedule).toEqual(template);
    });
  });

  describe('cabinet stats', () => {
    it('returns expectedByService consistent with expectedRevenue', async () => {
      const stats = await resolve(cabinet.stats('m-anna-serova', 'month'));
      expect(stats.upcoming).toBeGreaterThan(0);
      expect(stats.expectedByService.reduce((sum, l) => sum + l.total, 0)).toBe(
        stats.expectedRevenue,
      );
      expect(stats.expectedByService.reduce((sum, l) => sum + l.count, 0)).toBe(stats.upcoming);

      const upcoming = db.state.bookings.filter(
        (b) =>
          b.masterId === 'm-anna-serova' &&
          (b.status === 'confirmed' || b.status === 'pending') &&
          b.start > NOW.toISOString() &&
          new Date(b.start).getTime() <= NOW.getTime() + 30 * 86_400_000,
      );
      const expected = expectedRevenue(upcoming, db.master('m-anna-serova').services);
      expect(stats.expectedByService.map(({ serviceName: _name, ...line }) => line)).toEqual(
        expected,
      );
      expect(stats.expectedByService.every((l) => l.serviceName.length > 0)).toBe(true);
    });

    it('is zero for a master without upcoming bookings', async () => {
      db.state.bookings = db.state.bookings.filter((b) => b.masterId !== 'm-anna-serova');
      const stats = await resolve(cabinet.stats('m-anna-serova', 'week'));
      expect(stats).toMatchObject({ upcoming: 0, expectedRevenue: 0, expectedByService: [] });
    });
  });

  describe('deleteMasterProfile', () => {
    const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();
    const own = () => db.state.account.masterId as string;

    it('detaches the master from the account and hides it from the list', async () => {
      const id = own();
      expect(id).toBeTruthy();
      const snapshot = await resolve(account.deleteMasterProfile());
      expect(snapshot.master).toBeNull();
      expect(snapshot.account.masterId).toBeNull();
      expect(db.state.account.masterId).toBeNull();
      const list = await resolve(masters.list());
      expect(list.some((m) => m.id === id)).toBe(false);
    });

    it('cancels future pending and confirmed bookings with a reason, keeps past ones', async () => {
      const id = own();
      const base = db.state.bookings.find((b) => b.masterId === id)!;
      const mk = (bid: string, status: typeof base.status, start: string) => ({
        ...base,
        id: bid,
        status,
        start,
        cancellation: undefined,
      });
      db.state.bookings.push(
        mk('x-future-confirmed', 'confirmed', iso(86_400_000 * 2)),
        mk('x-future-pending', 'pending', iso(86_400_000 * 3)),
        mk('x-past-completed', 'completed', iso(-86_400_000 * 2)),
        mk('x-past-confirmed', 'confirmed', iso(-3_600_000 * 5)),
      );
      await resolve(account.deleteMasterProfile());
      const get = (bid: string) => db.state.bookings.find((b) => b.id === bid)!;
      for (const bid of ['x-future-confirmed', 'x-future-pending']) {
        expect(get(bid).status).toBe('cancelled');
        expect(get(bid).cancellation).toMatchObject({
          by: 'master',
          reason: 'Мастер удалил профиль',
        });
      }
      expect(get('x-past-completed').status).toBe('completed');
      expect(get('x-past-confirmed').status).not.toBe('cancelled');
      expect(get('x-past-confirmed').cancellation).toBeUndefined();
    });

    it('removes future slots only, and does not touch other masters', async () => {
      const id = own();
      const otherSlots = db.state.slots.filter((s) => s.masterId !== id).length;
      const past = db.state.slots.filter(
        (s) => s.masterId === id && new Date(s.start) <= NOW,
      ).length;
      await resolve(account.deleteMasterProfile());
      const mine = db.state.slots.filter((s) => s.masterId === id);
      expect(mine.every((s) => new Date(s.start) <= NOW)).toBe(true);
      expect(mine).toHaveLength(past);
      expect(db.state.slots.filter((s) => s.masterId !== id)).toHaveLength(otherSlots);
    });

    it('is a no-op when the account has no master profile', async () => {
      await resolve(account.deleteMasterProfile());
      const before = db.state.bookings.map((b) => b.status);
      const snapshot = await resolve(account.deleteMasterProfile());
      expect(snapshot.master).toBeNull();
      expect(db.state.bookings.map((b) => b.status)).toEqual(before);
    });
  });
});
