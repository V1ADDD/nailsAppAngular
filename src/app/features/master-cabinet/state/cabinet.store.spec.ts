import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  AccountApi,
  BookingsApi,
  type BookingView,
  CabinetApi,
  type CabinetClient,
  type CabinetStats,
  ChatsApi,
  MastersApi,
} from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import { CabinetStore } from './cabinet.store';

const master = {
  id: 'm1',
  name: 'Анна Серова',
  photoUrl: null,
  about: '',
  address: 'ул. Ленина, 42',
  portfolio: [],
  courses: [],
  services: [],
  contacts: { phone: '+375291112233', email: 'anna@mail.by' },
  schedule: { workDays: [1, 2, 3, 4, 5], from: '10:00', to: '19:00', slotMinutes: 90 },
  verification: 'none',
} as unknown as Master;

const slot: Slot = {
  id: 's1',
  masterId: 'm1',
  start: '2030-01-10T07:00:00.000Z',
  durationMin: 60,
  status: 'free',
  bookingId: null,
};

const stats = (period: CabinetStats['period']): CabinetStats => ({
  period,
  completed: 3,
  noShow: 1,
  cancelled: 0,
  upcoming: 2,
  revenue: 120,
  expectedRevenue: 80,
});

const clients = [
  {
    client: { id: 'c1', name: 'Алина', phone: '+375291' },
    services: [],
    nextBooking: null,
    lastBooking: null,
  },
  {
    client: { id: 'c2', name: 'Марина', phone: '+375292' },
    services: [],
    nextBooking: null,
    lastBooking: null,
  },
] as unknown as CabinetClient[];

function setup() {
  const bookingsApi = {
    slots: jest.fn(() => of([slot])),
    forMaster: jest.fn(() => of([] as BookingView[])),
    cancel: jest.fn(() => of({ id: 'b1', status: 'cancelled' } as BookingView)),
    addSlot: jest.fn((_m: string, start: string) => of({ ...slot, id: 's0', start })),
    removeSlot: jest.fn(() => of(undefined)),
    generateSlots: jest.fn(() => of([slot, { ...slot, id: 's2' }])),
  };
  const cabinetApi = {
    clients: jest.fn(() => of(clients)),
    stats: jest.fn((_id: string, period: CabinetStats['period']) => of(stats(period))),
    updateProfile: jest.fn((_id: string, patch: Partial<Master>) => of({ ...master, ...patch })),
    requestVerification: jest.fn(() => throwError(() => new Error('Сервис недоступен'))),
  };
  const mastersApi = { list: jest.fn(() => of([master])) };
  const chatsApi = { ensureChat: jest.fn(() => of({ id: 'chat-1' })) };

  TestBed.configureTestingModule({
    providers: [
      CabinetStore,
      { provide: BookingsApi, useValue: bookingsApi },
      { provide: CabinetApi, useValue: cabinetApi },
      { provide: MastersApi, useValue: mastersApi },
      { provide: ChatsApi, useValue: chatsApi },
      { provide: AccountApi, useValue: {} },
    ],
  });
  const store = TestBed.inject(CabinetStore);
  const session = signal<Master | null>(master);
  TestBed.runInInjectionContext(() => store.connect(session));
  TestBed.tick();
  return { store, session, bookingsApi, cabinetApi, mastersApi, chatsApi };
}

describe('CabinetStore', () => {
  it('loads schedule, clients, stats and market masters for the session master', () => {
    const { store, bookingsApi, cabinetApi, mastersApi } = setup();
    expect(store.master()?.id).toBe('m1');
    expect(bookingsApi.slots).toHaveBeenCalledWith('m1');
    expect(store.slots()).toEqual([slot]);
    expect(store.clients()).toHaveLength(2);
    expect(cabinetApi.stats).toHaveBeenCalledWith('m1', 'week');
    expect(store.currentStats()?.revenue).toBe(120);
    expect(mastersApi.list).toHaveBeenCalled();
    expect(store.loading().schedule).toBe(false);
  });

  it('keeps the same data when the session master object changes but not the id', () => {
    const { store, session, bookingsApi } = setup();
    session.set({ ...master, name: 'Анна С.' });
    TestBed.tick();
    expect(store.master()?.name).toBe('Анна С.');
    expect(bookingsApi.slots).toHaveBeenCalledTimes(1);
  });

  it('opens «Расписание» by default and toggles sections', () => {
    const { store } = setup();
    expect(store.openSections().schedule).toBe(true);
    expect(store.openSections().card).toBe(false);
    store.toggleSection('card');
    store.toggleSection('schedule');
    expect(store.openSections()).toMatchObject({ card: true, schedule: false });
  });

  it('moves the schedule date by period and opens a day from the month view', () => {
    const { store } = setup();
    store.setScheduleDate('2026-08-27');
    store.setSchedulePeriod('week');
    store.shiftSchedule(1);
    expect(store.scheduleDate()).toBe('2026-09-03');
    store.openDay('2026-09-05');
    expect(store.schedulePeriod()).toBe('day');
    expect(store.scheduleDate()).toBe('2026-09-05');
  });

  it('loads stats for a new period only once', () => {
    const { store, cabinetApi } = setup();
    store.setStatsPeriod('day');
    store.setStatsPeriod('week');
    store.setStatsPeriod('day');
    expect(cabinetApi.stats).toHaveBeenCalledTimes(2);
    expect(store.currentStats()?.period).toBe('day');
  });

  it('filters clients by the search query', () => {
    const { store } = setup();
    store.setClientQuery('мари');
    expect(store.filteredClients().map((c) => c.client.id)).toEqual(['c2']);
  });

  it('updates the profile and reports success', () => {
    const { store, cabinetApi } = setup();
    const onSuccess = jest.fn();
    store.updateProfile({ about: 'Опыт 5 лет' }, { onSuccess });
    expect(cabinetApi.updateProfile).toHaveBeenCalledWith('m1', { about: 'Опыт 5 лет' });
    expect(store.master()?.about).toBe('Опыт 5 лет');
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ about: 'Опыт 5 лет' }));
    expect(store.saving()).toBe(false);
    expect(store.completeness()?.missing).not.toContain('о себе');
  });

  it('reports mutation errors through onError', () => {
    const { store } = setup();
    const onError = jest.fn();
    store.requestVerification({ onError });
    expect(onError).toHaveBeenCalledWith('Сервис недоступен');
    expect(store.saving()).toBe(false);
  });

  it('cancels as master with reason + mutual flag and refreshes the schedule', () => {
    const { store, bookingsApi } = setup();
    store.cancelBooking({ bookingId: 'b1', reason: 'Заболела', mutual: true });
    expect(bookingsApi.cancel).toHaveBeenCalledWith('b1', 'master', 'Заболела', true);
    expect(bookingsApi.slots).toHaveBeenCalledTimes(2);
  });

  it('adds, removes and regenerates slots', () => {
    const { store, bookingsApi } = setup();
    store.addSlot('2030-01-09T07:00:00.000Z', 60);
    expect(store.slots().map((s) => s.id)).toEqual(['s0', 's1']);
    store.removeSlot('s0');
    expect(store.slots().map((s) => s.id)).toEqual(['s1']);
    const template = { workDays: [6], from: '09:00', to: '12:00', slotMinutes: 60 };
    store.generateSlots(template, 14);
    expect(bookingsApi.generateSlots).toHaveBeenCalledWith('m1', template, 14);
    expect(store.slots()).toHaveLength(2);
    expect(store.master()?.schedule).toEqual(template);
  });

  it('resolves the chat id for «Написать»', () => {
    const { store, chatsApi } = setup();
    const onSuccess = jest.fn();
    store.openChat('c1', { onSuccess });
    expect(chatsApi.ensureChat).toHaveBeenCalledWith('m1', 'c1');
    expect(onSuccess).toHaveBeenCalledWith('chat-1');
  });
});
