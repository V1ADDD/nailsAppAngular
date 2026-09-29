import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  type BookingView,
  BookingsApi,
  ChatsApi,
  type CreateBookingResult,
  MastersApi,
} from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import { MasterProfileStore } from './master-profile.store';

const HOUR = 3_600_000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR).toISOString();

const master = {
  id: 'm1',
  name: 'Анна Серова',
  categoryIds: ['manicure'],
  address: 'ул. Ленина, 42',
  city: 'Минск',
  rating: 4.8,
  services: [
    {
      id: 's1',
      subcategoryId: 'manicure-gel',
      price: { kind: 'exact', amount: 45 },
      durationMin: 90,
    },
    {
      id: 's2',
      subcategoryId: 'manicure-french',
      price: { kind: 'exact', amount: 50 },
      durationMin: 60,
    },
  ],
} as unknown as Master;

const slots: Slot[] = [
  {
    id: 'free1',
    masterId: 'm1',
    start: inHours(30),
    durationMin: 60,
    status: 'free',
    bookingId: null,
  },
  {
    id: 'busy1',
    masterId: 'm1',
    start: inHours(31),
    durationMin: 60,
    status: 'busy',
    bookingId: null,
  },
];

const otherBooking = { id: 'b0', masterName: 'Марина', serviceName: 'Брови' } as BookingView;

function setup(
  overrides: { create?: jest.Mock; checkConflicts?: jest.Mock; getById?: jest.Mock } = {},
) {
  const mastersApi = {
    getById: overrides.getById ?? jest.fn(() => of(master)),
    getSlots: jest.fn(() => of(slots)),
    getReviews: jest.fn(() => of([])),
  };
  const bookingsApi = {
    checkConflicts:
      overrides.checkConflicts ?? jest.fn(() => of({ overlapping: [], tooClose: [] })),
    create:
      overrides.create ??
      jest.fn(() =>
        of({
          booking: {},
          chatId: 'chat-1',
          autoCancelled: [],
          tooClose: [],
        } as unknown as CreateBookingResult),
      ),
  };
  const chatsApi = { ensureChat: jest.fn(() => of({ id: 'chat-1' })) };
  TestBed.configureTestingModule({
    providers: [
      MasterProfileStore,
      { provide: MastersApi, useValue: mastersApi },
      { provide: BookingsApi, useValue: bookingsApi },
      { provide: ChatsApi, useValue: chatsApi },
    ],
  });
  const store = TestBed.inject(MasterProfileStore);
  store.load('m1');
  return { store, mastersApi, bookingsApi, chatsApi };
}

describe('MasterProfileStore', () => {
  it('loads the master, client-masked slots and reviews', () => {
    const { store, mastersApi } = setup();
    expect(mastersApi.getSlots).toHaveBeenCalledWith('m1', 'client');
    expect(store.master()?.name).toBe('Анна Серова');
    expect(store.loading()).toBe(false);
    expect(store.nearestFree()[0]?.slots.map((s) => s.id)).toEqual(['free1']);
    expect(store.fromPrice()).toEqual({ kind: 'from', amount: 45 });
  });

  it('keeps the error when the master is not found', () => {
    const { store } = setup({
      getById: jest.fn(() => throwError(() => new Error('Мастер не найден'))),
    });
    expect(store.error()).toBe('Мастер не найден');
    expect(store.master()).toBeNull();
  });

  it('opens booking with a preselected service and slot, then checks conflicts', () => {
    const { store, bookingsApi } = setup();
    store.openBooking({ clientId: 'c1', subcategoryId: 'manicure-french', slotId: 'free1' });
    expect(store.booking().open).toBe(true);
    expect(store.selectedService()?.id).toBe('s2');
    expect(store.selectedSlot()?.id).toBe('free1');
    expect(bookingsApi.checkConflicts).toHaveBeenCalledWith('c1', 'free1');
    expect(store.canSubmit()).toBe(true);
    expect(store.releaseAt()).toBeInstanceOf(Date);
  });

  it('does not select busy slots', () => {
    const { store } = setup();
    store.openBooking({ clientId: 'c1' });
    store.selectSlot('busy1');
    expect(store.booking().slotId).toBeNull();
    expect(store.canSubmit()).toBe(false);
  });

  it('exposes ТЗ 6.10 conflicts for the warning', () => {
    const { store } = setup({
      checkConflicts: jest.fn(() => of({ overlapping: [otherBooking], tooClose: [] })),
    });
    store.openBooking({ clientId: 'c1', subcategoryId: 'manicure-gel' });
    store.selectSlot('free1');
    expect(store.booking().conflicts?.overlapping).toEqual([otherBooking]);
  });

  it('books as a client and reports the result', () => {
    const { store, bookingsApi, mastersApi } = setup();
    const onSuccess = jest.fn();
    store.openBooking({ clientId: 'c1', subcategoryId: 'manicure-gel', slotId: 'free1' });
    store.book({ onSuccess });
    expect(bookingsApi.create).toHaveBeenCalledWith({
      masterId: 'm1',
      clientId: 'c1',
      slotId: 'free1',
      subcategoryId: 'manicure-gel',
      createdBy: 'client',
    });
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ chatId: 'chat-1' }));
    expect(store.booking().open).toBe(false);
    expect(mastersApi.getSlots).toHaveBeenCalledTimes(2);
  });

  it('keeps the sheet open with an error when booking fails', () => {
    const { store } = setup({
      create: jest.fn(() => throwError(() => new Error('Это окно уже занято'))),
    });
    const onSuccess = jest.fn();
    store.openBooking({ clientId: 'c1', subcategoryId: 'manicure-gel', slotId: 'free1' });
    store.book({ onSuccess });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(store.booking().open).toBe(true);
    expect(store.booking().error).toBe('Это окно уже занято');
    expect(store.booking().submitting).toBe(false);
  });

  it('opens the chat with the master', () => {
    const { store, chatsApi } = setup();
    const onSuccess = jest.fn();
    store.openChat({ clientId: 'c1', onSuccess, onError: jest.fn() });
    expect(chatsApi.ensureChat).toHaveBeenCalledWith('m1', 'c1');
    expect(onSuccess).toHaveBeenCalledWith('chat-1');
  });
});
