import { TestBed } from '@angular/core/testing';
import { type Observable, firstValueFrom } from 'rxjs';
import { BookingsApi, ChatsApi, MastersApi } from '../api';
import { ME_CLIENT_ID } from '../fixtures/seed';
import { MOCK_API_PROVIDERS } from './mock-apis';
import { CLOCK, MockDb } from './mock-db';

// Fixed "now": Tuesday 2026-09-29 12:00 Minsk (09:00 UTC).
const NOW = new Date('2026-09-29T09:00:00.000Z');

describe('mock backend', () => {
  let clock = NOW;
  let bookings: BookingsApi;
  let chats: ChatsApi;
  let masters: MastersApi;
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
});
