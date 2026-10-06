import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  type Observable,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  mergeMap,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import {
  AccountApi,
  type AccountSnapshot,
  type BecomeMasterInput,
  BookingsApi,
  type BookingView,
  CabinetApi,
  type CabinetClient,
  type CabinetStats,
  type CreateBookingInput,
  type CreateBookingResult,
  type ExternalBookingInput,
  ChatsApi,
  MastersApi,
  type ServiceProposal,
  type StatsPeriod,
} from '@app/core/data/api';
import {
  type Master,
  type MasterService,
  type PortfolioPhoto,
  type ScheduleTemplate,
  type Slot,
} from '@app/core/data/models';
import { dayKey } from '@app/shared/format/dates';
import {
  type SchedulePeriod,
  buildDay,
  buildMonth,
  buildRows,
  buildBookingList,
  buildWeek,
  byNearestBooking,
  groupByDay,
  matchClient,
  profileCompleteness,
  shiftDate,
} from './schedule-logic';

export type ListMode = 'upcoming' | 'past';

export type ProfilePatch = Parameters<CabinetApi['updateProfile']>[1];

/** Optional callbacks so the UI can close sheets / show toasts after a mutation. */
export interface Done<T = unknown> {
  onSuccess?: (result: T) => void;
  onError?: (message: string) => void;
}

type Area = 'schedule' | 'clients' | 'stats' | 'masters';

interface Job {
  request: Observable<unknown>;
  apply: (result: unknown) => void;
  done: Done<unknown>;
}

interface CabinetState {
  master: Master | null;
  slots: Slot[];
  bookings: BookingView[];
  clients: CabinetClient[];
  stats: Partial<Record<StatsPeriod, CabinetStats>>;
  allMasters: Master[];
  schedulePeriod: SchedulePeriod;
  /** «Записи» shows the list instead of the calendar. */
  scheduleList: boolean;
  listMode: ListMode;
  scheduleDate: string;
  statsPeriod: StatsPeriod;
  clientQuery: string;
  loading: Record<Area, boolean>;
  errors: Record<Area, string | null>;
  /** A mutation is in flight (disables submit buttons). */
  saving: boolean;
}

const initialState = (): CabinetState => ({
  master: null,
  slots: [],
  bookings: [],
  clients: [],
  stats: {},
  allMasters: [],
  schedulePeriod: 'day',
  scheduleList: true,
  listMode: 'upcoming',
  scheduleDate: dayKey(new Date()),
  statsPeriod: 'month',
  clientQuery: '',
  loading: { schedule: false, clients: false, stats: false, masters: false },
  errors: { schedule: null, clients: null, stats: null, masters: null },
  saving: false,
});

/** Master cabinet state (ТЗ 4, 6, 7). Provided by the cabinet page. */
export const CabinetStore = signalStore(
  withState<CabinetState>(initialState),
  withComputed((store) => {
    const rowsByDay = computed(() => groupByDay(buildRows(store.slots(), store.bookings())));
    return {
      todayKey: computed(() => dayKey(new Date())),
      completeness: computed(() => {
        const master = store.master();
        return master ? profileCompleteness(master) : null;
      }),
      rowsByDay,
      dayView: computed(() => buildDay(rowsByDay(), store.scheduleDate())),
      weekView: computed(() => buildWeek(rowsByDay(), store.scheduleDate())),
      monthView: computed(() => buildMonth(rowsByDay(), store.scheduleDate(), dayKey(new Date()))),
      filteredClients: computed(() =>
        store
          .clients()
          .filter((c) => matchClient(c, store.clientQuery()))
          .sort(byNearestBooking),
      ),
      currentStats: computed(() => store.stats()[store.statsPeriod()] ?? null),
      /** Hub summary: today's bookings and what waits for the master's answer. */
      today: computed(() => {
        const now = new Date().toISOString();
        const rows = (rowsByDay().get(dayKey(new Date())) ?? []).filter((r) => r.booking);
        return {
          count: rows.length,
          next: rows.find((r) => r.start > now && r.status !== 'no-show') ?? null,
          free: (rowsByDay().get(dayKey(new Date())) ?? []).filter(
            (r) => r.status === 'free' && r.start > now,
          ).length,
        };
      }),
      /** «Записи → Список»: bookings grouped by day, upcoming ascending or past descending. */
      bookingList: computed(() => buildBookingList(rowsByDay(), store.listMode(), new Date())),
      upcomingCount: computed(
        () =>
          [...rowsByDay().values()]
            .flat()
            .filter((r) => r.booking && !r.past && r.status !== 'no-show').length,
      ),
      pendingCount: computed(
        () =>
          store
            .bookings()
            .filter((b) => b.status === 'pending' && b.start > new Date().toISOString()).length,
      ),
    };
  }),
  withMethods(
    (
      store,
      cabinetApi = inject(CabinetApi),
      bookingsApi = inject(BookingsApi),
      mastersApi = inject(MastersApi),
      chatsApi = inject(ChatsApi),
      accountApi = inject(AccountApi),
    ) => {
      const setLoading = (area: Area, value: boolean, error: string | null = null) =>
        patchState(store, {
          loading: { ...store.loading(), [area]: value },
          errors: { ...store.errors(), [area]: error },
        });

      const masterId = () => store.master()?.id ?? '';

      const loadSchedule = rxMethod<string>(
        pipe(
          tap(() => setLoading('schedule', true)),
          switchMap((id) =>
            forkJoin({ slots: bookingsApi.slots(id), bookings: bookingsApi.forMaster(id) }).pipe(
              tapResponse({
                next: ({ slots, bookings }) => {
                  patchState(store, { slots, bookings });
                  setLoading('schedule', false);
                },
                error: (e: Error) => setLoading('schedule', false, e.message),
              }),
            ),
          ),
        ),
      );

      const loadClients = rxMethod<string>(
        pipe(
          tap(() => setLoading('clients', true)),
          switchMap((id) =>
            cabinetApi.clients(id).pipe(
              tapResponse({
                next: (clients) => {
                  patchState(store, { clients });
                  setLoading('clients', false);
                },
                error: (e: Error) => setLoading('clients', false, e.message),
              }),
            ),
          ),
        ),
      );

      const loadStats = rxMethod<{ id: string; period: StatsPeriod }>(
        pipe(
          tap(() => setLoading('stats', true)),
          switchMap(({ id, period }) =>
            cabinetApi.stats(id, period).pipe(
              tapResponse({
                next: (stats) => {
                  patchState(store, { stats: { ...store.stats(), [period]: stats } });
                  setLoading('stats', false);
                },
                error: (e: Error) => setLoading('stats', false, e.message),
              }),
            ),
          ),
        ),
      );

      const loadMasters = rxMethod<void>(
        pipe(
          tap(() => setLoading('masters', true)),
          switchMap(() =>
            mastersApi.list().pipe(
              tapResponse({
                next: (allMasters) => {
                  patchState(store, { allMasters });
                  setLoading('masters', false);
                },
                error: (e: Error) => setLoading('masters', false, e.message),
              }),
            ),
          ),
        ),
      );

      const reloadAll = (id: string) => {
        patchState(store, { stats: {} });
        loadSchedule(id);
        loadClients(id);
        loadStats({ id, period: store.statsPeriod() });
        loadMasters();
      };

      const runner = rxMethod<Job>(
        pipe(
          mergeMap((job) =>
            job.request.pipe(
              tapResponse({
                next: (result) => {
                  job.apply(result);
                  patchState(store, { saving: false });
                  job.done.onSuccess?.(result);
                },
                error: (e: Error) => {
                  patchState(store, { saving: false });
                  job.done.onError?.(e.message);
                },
              }),
            ),
          ),
        ),
      );

      /** Runs a mutation, tracks `saving`, and reports through callbacks. */
      function mutate<T>(request: Observable<T>, apply: (result: T) => void, done: Done<T> = {}) {
        patchState(store, { saving: true });
        runner({ request, apply, done } as Job);
      }

      const setMaster = (master: Master) => patchState(store, { master });
      const replaceBooking = (booking: BookingView) =>
        patchState(store, {
          bookings: store.bookings().some((b) => b.id === booking.id)
            ? store.bookings().map((b) => (b.id === booking.id ? booking : b))
            : [...store.bookings(), booking],
        });
      /** Booking changes move slot statuses server-side; refresh the schedule + clients. */
      const afterBookingChange = () => {
        loadSchedule(masterId());
        loadClients(masterId());
        patchState(store, { stats: {} });
        loadStats({ id: masterId(), period: store.statsPeriod() });
      };

      return {
        loadSchedule,
        loadClients,
        loadStats,
        loadMasters,
        /** Follows the session's master; reloads everything when the master changes. */
        connect: rxMethod<Master | null>(
          pipe(
            tap((master) => patchState(store, { master })),
            map((master) => master?.id ?? null),
            distinctUntilChanged(),
            filter((id): id is string => !!id),
            tap((id) => reloadAll(id)),
          ),
        ),
        retry(area: Area): void {
          const id = masterId();
          if (area === 'schedule') loadSchedule(id);
          if (area === 'clients') loadClients(id);
          if (area === 'stats') loadStats({ id, period: store.statsPeriod() });
          if (area === 'masters') loadMasters();
        },

        // ── UI state ─────────────────────────────────────────────────────────
        setSchedulePeriod(schedulePeriod: SchedulePeriod): void {
          patchState(store, { schedulePeriod });
        },
        setScheduleList(scheduleList: boolean): void {
          patchState(store, { scheduleList });
        },
        setListMode(listMode: ListMode): void {
          patchState(store, { listMode });
        },
        setScheduleDate(scheduleDate: string): void {
          patchState(store, { scheduleDate });
        },
        shiftSchedule(step: number): void {
          patchState(store, {
            scheduleDate: shiftDate(store.scheduleDate(), store.schedulePeriod(), step),
          });
        },
        /** Month cell click: open that day. */
        openDay(key: string): void {
          patchState(store, { scheduleDate: key, schedulePeriod: 'day', scheduleList: false });
        },
        setStatsPeriod(statsPeriod: StatsPeriod): void {
          patchState(store, { statsPeriod });
          if (!store.stats()[statsPeriod] && masterId()) {
            loadStats({ id: masterId(), period: statsPeriod });
          }
        },
        setClientQuery(clientQuery: string): void {
          patchState(store, { clientQuery });
        },

        // ── Profile, services, portfolio, verification (CabinetApi) ──────────
        updateProfile(patch: ProfilePatch, done?: Done<Master>): void {
          mutate(cabinetApi.updateProfile(masterId(), patch), setMaster, done);
        },
        saveService(
          service: Omit<MasterService, 'id'> & { id?: string },
          done?: Done<Master>,
        ): void {
          mutate(cabinetApi.saveService(masterId(), service), setMaster, done);
        },
        removeService(serviceId: string, done?: Done<Master>): void {
          mutate(cabinetApi.removeService(masterId(), serviceId), setMaster, done);
        },
        proposeService(proposal: ServiceProposal, done?: Done<{ status: 'moderation' }>): void {
          mutate(cabinetApi.proposeService(masterId(), proposal), () => undefined, done);
        },
        addPortfolio(photos: Omit<PortfolioPhoto, 'id'>[], done?: Done<Master>): void {
          mutate(cabinetApi.addPortfolio(masterId(), photos), setMaster, done);
        },
        removePortfolio(photoIds: string[], done?: Done<Master>): void {
          mutate(cabinetApi.removePortfolio(masterId(), photoIds), setMaster, done);
        },
        requestVerification(done?: Done<Master>): void {
          mutate(cabinetApi.requestVerification(masterId()), setMaster, done);
        },

        // ── Bookings (ТЗ 6.3, 6.5, 6.8) ──────────────────────────────────────
        confirmBooking(bookingId: string, done?: Done<BookingView>): void {
          mutate(
            bookingsApi.confirm(bookingId, 'master'),
            (b) => {
              replaceBooking(b);
              afterBookingChange();
            },
            done,
          );
        },
        cancelBooking(
          input: { bookingId: string; reason: string; mutual: boolean },
          done?: Done<BookingView>,
        ): void {
          mutate(
            bookingsApi.cancel(input.bookingId, 'master', input.reason, input.mutual),
            (b) => {
              replaceBooking(b);
              afterBookingChange();
            },
            done,
          );
        },
        markNoShow(bookingId: string, done?: Done<BookingView>): void {
          mutate(
            bookingsApi.markNoShow(bookingId),
            (b) => {
              replaceBooking(b);
              afterBookingChange();
            },
            done,
          );
        },
        updateNote(bookingId: string, note: string, done?: Done<BookingView>): void {
          mutate(bookingsApi.updateNote(bookingId, note), replaceBooking, done);
        },
        addExternal(input: Omit<ExternalBookingInput, 'masterId'>, done?: Done<BookingView>): void {
          mutate(
            bookingsApi.addExternal({ ...input, masterId: masterId() }),
            (b) => {
              replaceBooking(b);
              afterBookingChange();
            },
            done,
          );
        },
        bookForClient(
          input: Omit<CreateBookingInput, 'masterId' | 'createdBy'>,
          done?: Done<CreateBookingResult>,
        ): void {
          mutate(
            bookingsApi.create({ ...input, masterId: masterId(), createdBy: 'master' }),
            (r) => {
              replaceBooking(r.booking);
              afterBookingChange();
            },
            done,
          );
        },

        // ── Onboarding & chats ─────────────────────────────────────────────────
        becomeMaster(input: BecomeMasterInput, done?: Done<AccountSnapshot>): void {
          mutate(
            accountApi.becomeMaster(input),
            (s) => {
              if (s.master) setMaster(s.master);
            },
            done,
          );
        },
        /** «Удалить профиль мастера»: the account stays a client account. */
        deleteMasterProfile(done?: Done<AccountSnapshot>): void {
          mutate(accountApi.deleteMasterProfile(), () => patchState(store, { master: null }), done);
        },
        /** ТЗ 7.2 «Написать»: one chat per master ↔ client pair; resolves the chat id. */
        openChat(clientId: string, done?: Done<string>): void {
          mutate(
            chatsApi.ensureChat(masterId(), clientId).pipe(map((chat) => chat.id)),
            () => undefined,
            done,
          );
        },

        // ── Slots (ТЗ 6.1) ───────────────────────────────────────────────────
        generateSlots(template: ScheduleTemplate, days: number, done?: Done<Slot[]>): void {
          mutate(
            bookingsApi.generateSlots(masterId(), template, days),
            (slots) => {
              const master = store.master();
              patchState(store, {
                slots,
                master: master ? { ...master, schedule: template } : master,
              });
            },
            done,
          );
        },
        addSlot(start: string, durationMin: number, done?: Done<Slot>): void {
          mutate(
            bookingsApi.addSlot(masterId(), start, durationMin),
            (slot) =>
              patchState(store, {
                slots: [...store.slots(), slot].sort((a, b) => a.start.localeCompare(b.start)),
              }),
            done,
          );
        },
        moveSlot(slotId: string, start: string, done?: Done<Slot>): void {
          mutate(
            bookingsApi.moveSlot(slotId, start),
            (slot) =>
              patchState(store, {
                slots: store
                  .slots()
                  .map((s) => (s.id === slot.id ? slot : s))
                  .sort((a, b) => a.start.localeCompare(b.start)),
              }),
            done,
          );
        },
        removeSlot(slotId: string, done?: Done<void>): void {
          mutate(
            bookingsApi.removeSlot(slotId),
            () => patchState(store, { slots: store.slots().filter((s) => s.id !== slotId) }),
            done,
          );
        },
      };
    },
  ),
);

export type CabinetStore = InstanceType<typeof CabinetStore>;
