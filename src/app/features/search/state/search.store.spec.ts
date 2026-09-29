import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ChatsApi, MastersApi } from '@app/core/data/api';
import { type Master, type Slot } from '@app/core/data/models';
import { EMPTY_FILTERS } from './search-logic';
import { SearchStore } from './search.store';

function master(id: string, patch: Partial<Master> = {}): Master {
  return {
    id,
    organizationId: null,
    name: `Мастер ${id}`,
    photoUrl: null,
    categoryIds: ['manicure'],
    specialty: 'Мастер ногтей',
    city: 'Минск',
    district: 'Центральный',
    address: '',
    location: { lat: 53.9038, lng: 27.5567 },
    rating: 4.5,
    reviewsCount: 1,
    experienceYears: 1,
    verification: 'none',
    online: false,
    replyMinutes: 10,
    about: '',
    courses: [],
    contacts: { phone: '', email: '' },
    services: [
      {
        id: `${id}-s`,
        subcategoryId: 'manicure-hardware',
        price: { kind: 'exact', amount: 30 },
        durationMin: 60,
      },
    ],
    portfolio: [],
    bookingsCount: 0,
    schedule: { workDays: [1], from: '10:00', to: '19:00', slotMinutes: 60 },
    autoConfirm: { enabled: false, afterMinutes: 30 },
    ...patch,
  };
}

const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
const freeSlot = (masterId: string): Slot => ({
  id: `${masterId}-slot`,
  masterId,
  start: tomorrow,
  durationMin: 60,
  status: 'free',
  bookingId: null,
});

function setup(list = jest.fn(() => of([master('a', { online: true }), master('b')]))) {
  const getSlots = jest.fn((id: string) => of(id === 'a' ? [freeSlot('a')] : []));
  TestBed.configureTestingModule({
    providers: [
      { provide: MastersApi, useValue: { list, getSlots } },
      { provide: ChatsApi, useValue: { ensureChat: jest.fn(() => of({ id: 'chat-1' })) } },
    ],
  });
  return { store: TestBed.inject(SearchStore), list, getSlots };
}

describe('SearchStore', () => {
  it('loads masters and exposes results with counts', () => {
    const { store } = setup();
    store.load();
    expect(store.loading()).toBe(false);
    expect(store.results().map((r) => r.master.id)).toEqual(['a', 'b']);
    expect(store.onlineCount()).toBe(1);
    expect(store.activeFilterCount()).toBe(0);
  });

  it('keeps the error for the error state', () => {
    const { store } = setup(jest.fn(() => throwError(() => new Error('Сеть недоступна'))));
    store.load();
    expect(store.error()).toBe('Сеть недоступна');
    expect(store.loading()).toBe(false);
  });

  it('filters and resets', () => {
    const { store } = setup();
    store.load();
    store.patchFilters({ onlineOnly: true });
    expect(store.results().map((r) => r.master.id)).toEqual(['a']);
    expect(store.activeFilterCount()).toBe(1);
    expect(store.countFor(EMPTY_FILTERS)).toBe(2);
    store.resetFilters();
    expect(store.results()).toHaveLength(2);
  });

  it('loads slots lazily only when the free-window filter is used', () => {
    const { store, getSlots } = setup();
    store.load();
    expect(getSlots).not.toHaveBeenCalled();
    store.patchFilters({ freeWindow: 'tomorrow' });
    expect(getSlots).toHaveBeenCalledTimes(2);
    expect(store.results().map((r) => r.master.id)).toEqual(['a']);
    store.setSort('slot');
    expect(getSlots).toHaveBeenCalledTimes(2); // cached
  });

  it('debounces the search query', () => {
    jest.useFakeTimers();
    const { store } = setup();
    store.load();
    store.setQueryDebounced('аппарат');
    expect(store.query()).toBe('');
    jest.advanceTimersByTime(300);
    expect(store.query()).toBe('аппарат');
    jest.useRealTimers();
  });
});
