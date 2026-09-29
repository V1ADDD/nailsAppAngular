import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  mergeMap,
  of,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import { ChatsApi, MastersApi } from '@app/core/data/api';
import { USER_LOCATION } from '@app/core/data/fixtures/masters.fixtures';
import { type LatLng, type Master, type Slot } from '@app/core/data/models';
import {
  EMPTY_FILTERS,
  type SearchFilters,
  type SortKey,
  activeFilterCount,
  needsSlots,
  searchMasters,
} from './search-logic';

interface SearchState {
  loading: boolean;
  error: string | null;
  /** Client-masked slots per master, loaded lazily for the free-window filter / slot sort. */
  slots: Record<string, Slot[]>;
  slotsLoading: boolean;
  query: string;
  filters: SearchFilters;
  sort: SortKey;
  location: LatLng;
  selectedId: string | null;
  hoveredId: string | null;
}

const initialState: SearchState = {
  loading: false,
  error: null,
  slots: {},
  slotsLoading: false,
  query: '',
  filters: EMPTY_FILTERS,
  sort: 'distance',
  location: USER_LOCATION,
  selectedId: null,
  hoveredId: null,
};

/**
 * Map home / search (ТЗ 5). Provided in root so filters, query and sort survive a visit to a
 * master's profile and back.
 */
export const SearchStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withEntities<Master>(),
  withComputed((store) => ({
    results: computed(() =>
      searchMasters({
        masters: store.entities(),
        query: store.query(),
        filters: store.filters(),
        sort: store.sort(),
        location: store.location(),
        slots: store.slots(),
        now: new Date(),
      }),
    ),
    activeFilterCount: computed(() => activeFilterCount(store.filters())),
    hasCriteria: computed(
      () => activeFilterCount(store.filters()) > 0 || store.query().trim().length > 0,
    ),
  })),
  withComputed(({ results }) => ({
    onlineCount: computed(() => results().filter((r) => r.master.online).length),
  })),
  withMethods((store, mastersApi = inject(MastersApi), chatsApi = inject(ChatsApi)) => {
    const loadSlots = rxMethod<string[]>(
      pipe(
        map((ids) => ids.filter((id) => !(id in store.slots()))),
        tap((ids) => ids.length && patchState(store, { slotsLoading: true })),
        mergeMap((ids) =>
          ids.length === 0
            ? of({})
            : forkJoin(
                Object.fromEntries(
                  ids.map((id) => [
                    id,
                    // A master whose slots fail to load simply has no free window.
                    mastersApi.getSlots(id, 'client').pipe(catchError(() => of([] as Slot[]))),
                  ]),
                ),
              ),
        ),
        tap((loaded: Record<string, Slot[]>) =>
          patchState(store, { slots: { ...store.slots(), ...loaded }, slotsLoading: false }),
        ),
      ),
    );

    const ensureSlots = (filters = store.filters(), sort = store.sort()) => {
      if (needsSlots(filters, sort) && store.ids().length) {
        loadSlots(store.ids() as string[]);
      }
    };

    const load = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: store.ids().length === 0, error: null })),
        switchMap(() =>
          mastersApi.list().pipe(
            tapResponse({
              next: (masters) => {
                patchState(store, setAllEntities(masters), { loading: false, slots: {} });
                ensureSlots();
              },
              error: (e: Error) => patchState(store, { error: e.message, loading: false }),
            }),
          ),
        ),
      ),
    );

    const setQueryDebounced = rxMethod<string>(
      pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap((query) => patchState(store, { query })),
      ),
    );

    return {
      load,
      ensureSlots,
      setQueryDebounced,
      setQuery(query: string): void {
        patchState(store, { query });
      },
      setLocation(location: LatLng): void {
        patchState(store, { location });
      },
      setFilters(filters: SearchFilters): void {
        patchState(store, { filters });
        ensureSlots(filters);
      },
      patchFilters(patch: Partial<SearchFilters>): void {
        const filters = { ...store.filters(), ...patch };
        patchState(store, { filters });
        ensureSlots(filters);
      },
      resetFilters(): void {
        patchState(store, { filters: EMPTY_FILTERS, query: '' });
      },
      setSort(sort: SortKey): void {
        patchState(store, { sort });
        ensureSlots(undefined, sort);
      },
      select(selectedId: string | null): void {
        patchState(store, { selectedId });
      },
      hover(hoveredId: string | null): void {
        patchState(store, { hoveredId });
      },
      /** Result count for a draft of filters, for «Показать N мастеров». */
      countFor(filters: SearchFilters): number {
        return searchMasters({
          masters: store.entities(),
          query: store.query(),
          filters,
          sort: store.sort(),
          location: store.location(),
          slots: store.slots(),
          now: new Date(),
        }).length;
      },
      /** The chat with a master (created on first contact), for «Написать». */
      chatWith(masterId: string, clientId: string) {
        return chatsApi.ensureChat(masterId, clientId);
      },
    };
  }),
);

export type SearchStore = InstanceType<typeof SearchStore>;
