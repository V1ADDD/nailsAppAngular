import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  AccountApi,
  BookingsApi,
  type BookingView,
  ChatsApi,
  MastersApi,
  ReviewsApi,
} from '@app/core/data/api';
import { ClientAccountStore } from './client-account.store';
import { bookAgainUrl, partitionBookings } from './partition-bookings';

const NOW = new Date('2026-09-29T12:00:00Z');
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

function booking(partial: Partial<BookingView> & { id: string }): BookingView {
  return {
    masterId: 'm1',
    clientId: 'c1',
    subcategoryId: 'manicure-gel',
    price: { kind: 'exact', amount: 45 },
    start: hoursFromNow(24),
    durationMin: 90,
    address: 'ул. Ленина, 42',
    status: 'confirmed',
    source: 'site',
    createdBy: 'client',
    createdAt: hoursFromNow(-48),
    slotId: 's1',
    chatId: 'chat-1',
    masterName: 'Анна Серова',
    masterPhotoUrl: null,
    clientName: 'Анна Новикова',
    clientPhotoUrl: null,
    serviceName: 'Покрытие гель-лаком',
    releaseAt: null,
    ...partial,
  };
}

describe('partitionBookings', () => {
  it('puts active future bookings in upcoming (soonest first), the rest in past (newest first)', () => {
    const list = [
      booking({ id: 'later', start: hoursFromNow(72) }),
      booking({ id: 'soon', start: hoursFromNow(2), status: 'pending' }),
      booking({ id: 'done', start: hoursFromNow(-72), status: 'completed' }),
      booking({ id: 'cancelled-future', start: hoursFromNow(10), status: 'cancelled' }),
      booking({ id: 'started', start: hoursFromNow(-1) }),
      booking({ id: 'no-show', start: hoursFromNow(-200), status: 'no-show' }),
    ];
    const { upcoming, past } = partitionBookings(list, NOW);
    expect(upcoming.map((b) => b.id)).toEqual(['soon', 'later']);
    expect(past.map((b) => b.id)).toEqual(['cancelled-future', 'started', 'done', 'no-show']);
  });

  it('builds the booking-flow URL for the same master and service', () => {
    expect(bookAgainUrl({ masterId: 'm7', subcategoryId: 'brows-tint' })).toBe(
      '/masters/m7?book=1&service=brows-tint',
    );
  });
});

describe('ClientAccountStore', () => {
  let bookingsApi: {
    forClient: jest.Mock;
    cancel: jest.Mock;
    confirm: jest.Mock;
  };
  let chatsApi: { ensureChat: jest.Mock };
  const upcoming = booking({ id: 'b1', start: new Date(Date.now() + 86_400_000).toISOString() });
  const past = booking({
    id: 'b2',
    start: new Date(Date.now() - 86_400_000).toISOString(),
    status: 'completed',
  });

  function setup() {
    bookingsApi = {
      forClient: jest.fn(() => of([upcoming, past])),
      cancel: jest.fn((id: string, _by: string, reason: string, mutual: boolean) =>
        of({
          ...upcoming,
          id,
          status: 'cancelled',
          cancellation: { by: 'client', reason, mutual, at: '' },
        }),
      ),
      confirm: jest.fn((id: string) => of({ ...upcoming, id, status: 'confirmed' })),
    };
    chatsApi = { ensureChat: jest.fn(() => of({ id: 'chat-new' })) };
    TestBed.configureTestingModule({
      providers: [
        ClientAccountStore,
        { provide: BookingsApi, useValue: bookingsApi },
        { provide: ChatsApi, useValue: chatsApi },
        { provide: MastersApi, useValue: { list: () => of([]) } },
        {
          provide: ReviewsApi,
          useValue: { forClient: () => of({ written: [], aboutMe: [] }) },
        },
        { provide: AccountApi, useValue: {} },
      ],
    });
    const store = TestBed.inject(ClientAccountStore);
    store.load('c1');
    return store;
  }

  it('loads the client bookings and splits them into upcoming and past', () => {
    const store = setup();
    expect(bookingsApi.forClient).toHaveBeenCalledWith('c1');
    expect(store.bookingsLoading()).toBe(false);
    expect(store.upcoming().map((b) => b.id)).toEqual(['b1']);
    expect(store.past().map((b) => b.id)).toEqual(['b2']);
  });

  it('records a load error', () => {
    const store = setup();
    bookingsApi.forClient.mockReturnValue(throwError(() => new Error('Сеть недоступна')));
    store.loadBookings('c1');
    expect(store.bookingsError()).toBe('Сеть недоступна');
  });

  it('cancels as the client with a reason and moves the booking to past', async () => {
    const store = setup();
    await expect(store.cancel('b1', 'Изменились планы', false)).resolves.toBe(true);
    expect(bookingsApi.cancel).toHaveBeenCalledWith('b1', 'client', 'Изменились планы', false);
    expect(store.upcoming()).toEqual([]);
    expect(store.past().map((b) => b.id)).toContain('b1');
  });

  it('reschedule cancels (mutual by default) and returns the booking-flow URL', async () => {
    const store = setup();
    const url = await store.reschedule(upcoming, 'Перенос на другое время');
    expect(bookingsApi.cancel).toHaveBeenCalledWith(
      'b1',
      'client',
      'Перенос на другое время',
      true,
    );
    expect(url).toBe('/masters/m1?book=1&service=manicure-gel');
    expect(store.upcoming()).toEqual([]);
  });

  it('reschedule returns null and keeps the error when the cancellation fails', async () => {
    const store = setup();
    bookingsApi.cancel.mockReturnValue(
      throwError(() => new Error('Эту запись уже нельзя отменить')),
    );
    await expect(store.reschedule(upcoming, 'Перенос')).resolves.toBeNull();
    expect(store.actionError()).toBe('Эту запись уже нельзя отменить');
    expect(store.saving()).toBe(false);
    expect(store.upcoming().map((b) => b.id)).toEqual(['b1']);
  });

  it('confirms as the client', async () => {
    const store = setup();
    await store.confirm('b1');
    expect(bookingsApi.confirm).toHaveBeenCalledWith('b1', 'client');
  });

  it('opens an existing chat or creates one', async () => {
    const store = setup();
    await expect(store.chatFor(upcoming)).resolves.toBe('chat-1');
    await expect(store.chatFor({ ...upcoming, chatId: null })).resolves.toBe('chat-new');
    expect(chatsApi.ensureChat).toHaveBeenCalledWith('m1', 'c1');
  });
});
