import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, forkJoin, pipe, switchMap, tap } from 'rxjs';
import {
  type BookingView,
  BookingsApi,
  type CreateBookingResult,
  ChatsApi,
  MastersApi,
} from '@app/core/data/api';
import { type Master, type Review, type Slot } from '@app/core/data/models';
import { minPrice, onePerStart, pendingReleaseAt } from '@app/core/data/rules';
import { dayKey } from '@app/shared/format/dates';
import { buildDayOptions, groupServices, groupSlotsByDay } from './profile-helpers';

export interface Conflicts {
  overlapping: BookingView[];
  tooClose: BookingView[];
}

export interface BookingWizard {
  open: boolean;
  clientId: string | null;
  subcategoryId: string | null;
  /**
   * The service the client came for (search filter, a service row): the sheet shows only it and
   * folds the rest under «Другие услуги». Null when nothing was preselected.
   */
  focusSubcategoryId: string | null;
  day: string | null;
  slotId: string | null;
  conflicts: Conflicts | null;
  checking: boolean;
  submitting: boolean;
  error: string | null;
}

interface MasterProfileState {
  masterId: string | null;
  master: Master | null;
  slots: Slot[];
  loading: boolean;
  error: string | null;
  reviews: Review[];
  reviewsLoading: boolean;
  reviewsError: string | null;
  openingChat: boolean;
  booking: BookingWizard;
}

const CLOSED_WIZARD: BookingWizard = {
  open: false,
  clientId: null,
  subcategoryId: null,
  focusSubcategoryId: null,
  day: null,
  slotId: null,
  conflicts: null,
  checking: false,
  submitting: false,
  error: null,
};

const initialState: MasterProfileState = {
  masterId: null,
  master: null,
  slots: [],
  loading: false,
  error: null,
  reviews: [],
  reviewsLoading: false,
  reviewsError: null,
  openingChat: false,
  booking: CLOSED_WIZARD,
};

/** How many days of nearest free windows the profile previews. */
const PREVIEW_DAYS = 3;
const PREVIEW_SLOTS_PER_DAY = 6;

export interface OpenBookingOptions {
  clientId: string | null;
  subcategoryId?: string | null;
  slotId?: string | null;
}

export interface BookOptions {
  /** The client at submit time; falls back to the one captured on open. */
  clientId?: string | null;
  onSuccess: (result: CreateBookingResult) => void;
}

/** ТЗ 5.5 public master profile + ТЗ 6.2/6.3/6.10 booking wizard. */
export const MasterProfileStore = signalStore(
  withState(initialState),
  withComputed(({ master, slots, reviews, booking }) => {
    // Masters taking several clients at once have parallel slots: show one per start time.
    const visible = computed(() => onePerStart(slots()));
    const freeSlots = computed(() => visible().filter((s) => s.status === 'free'));
    const selectedSlot = computed(() => slots().find((s) => s.id === booking().slotId) ?? null);
    return {
      serviceGroups: computed(() => {
        const m = master();
        return m ? groupServices(m.services, m.categoryIds) : [];
      }),
      fromPrice: computed(() => minPrice(master()?.services ?? [])),
      nearestFree: computed(() =>
        groupSlotsByDay(freeSlots())
          .slice(0, PREVIEW_DAYS)
          .map((d) => ({ ...d, slots: d.slots.slice(0, PREVIEW_SLOTS_PER_DAY) })),
      ),
      averageRating: computed(() => {
        const list = reviews();
        if (list.length === 0) return master()?.rating ?? 0;
        return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
      }),
      dayOptions: computed(() => buildDayOptions(visible(), new Date())),
      daySlots: computed(() => {
        const day = booking().day;
        return day ? visible().filter((s) => dayKey(s.start) === day) : [];
      }),
      selectedService: computed(
        () => master()?.services.find((s) => s.subcategoryId === booking().subcategoryId) ?? null,
      ),
      selectedSlot,
      /** ТЗ 6.4: when the slot is released if the master does not confirm. */
      releaseAt: computed(() => {
        const slot = selectedSlot();
        return slot
          ? pendingReleaseAt({ start: slot.start, createdAt: new Date().toISOString() })
          : null;
      }),
      canSubmit: computed(() => {
        const b = booking();
        return !!b.subcategoryId && !!selectedSlot() && !b.checking && !b.submitting;
      }),
    };
  }),
  withMethods(
    (
      store,
      mastersApi = inject(MastersApi),
      bookingsApi = inject(BookingsApi),
      chatsApi = inject(ChatsApi),
    ) => {
      const patchWizard = (patch: Partial<BookingWizard>) =>
        patchState(store, (s) => ({ booking: { ...s.booking, ...patch } }));

      const loadReviews = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { reviewsLoading: true, reviewsError: null })),
          switchMap((id) =>
            mastersApi.getReviews(id).pipe(
              tapResponse({
                next: (reviews) => patchState(store, { reviews, reviewsLoading: false }),
                error: (e: Error) =>
                  patchState(store, { reviewsError: e.message, reviewsLoading: false }),
              }),
            ),
          ),
        ),
      );

      const reloadSlots = rxMethod<string>(
        pipe(
          switchMap((id) =>
            mastersApi.getSlots(id, 'client').pipe(
              tapResponse({
                next: (slots) => patchState(store, { slots }),
                error: () => undefined,
              }),
            ),
          ),
        ),
      );

      const checkConflicts = rxMethod<{ clientId: string; slotId: string }>(
        pipe(
          tap(() => patchWizard({ checking: true, conflicts: null })),
          switchMap(({ clientId, slotId }) =>
            bookingsApi.checkConflicts(clientId, slotId).pipe(
              tapResponse({
                next: (conflicts) => patchWizard({ conflicts, checking: false }),
                // A failed check must not block booking: the server re-checks on create.
                error: () => patchWizard({ checking: false }),
              }),
            ),
          ),
        ),
      );

      const selectSlot = (slotId: string | null): void => {
        const slot = store.slots().find((s) => s.id === slotId);
        if (!slot || slot.status !== 'free') {
          patchWizard({ slotId: null, conflicts: null, checking: false });
          return;
        }
        patchWizard({ slotId, day: dayKey(slot.start), error: null });
        const clientId = store.booking().clientId;
        if (clientId) checkConflicts({ clientId, slotId: slot.id });
      };

      return {
        loadReviews,
        load: rxMethod<string>(
          pipe(
            tap((id) => {
              patchState(store, { ...initialState, masterId: id, loading: true });
              loadReviews(id);
            }),
            switchMap((id) =>
              forkJoin({
                master: mastersApi.getById(id),
                slots: mastersApi.getSlots(id, 'client'),
              }).pipe(
                tapResponse({
                  next: ({ master, slots }) => patchState(store, { master, slots, loading: false }),
                  error: (e: Error) => patchState(store, { error: e.message, loading: false }),
                }),
              ),
            ),
          ),
        ),

        openBooking({ clientId, subcategoryId, slotId }: OpenBookingOptions): void {
          const services = store.master()?.services ?? [];
          const requested =
            services.find((s) => s.subcategoryId === subcategoryId)?.subcategoryId ?? null;
          const preselected =
            requested ?? (services.length === 1 ? services[0]!.subcategoryId : null);
          const firstFreeDay = store.dayOptions().find((d) => d.free > 0)?.key ?? null;
          patchState(store, {
            booking: {
              ...CLOSED_WIZARD,
              open: true,
              clientId,
              subcategoryId: preselected,
              focusSubcategoryId: services.length > 1 ? requested : null,
              day: firstFreeDay ?? store.dayOptions()[0]?.key ?? null,
            },
          });
          if (slotId) selectSlot(slotId);
        },

        /** ТЗ 8.2: one chat per master–client pair; creates it on first contact. */
        openChat: rxMethod<{
          clientId: string;
          onSuccess: (chatId: string) => void;
          onError: (message: string) => void;
        }>(
          pipe(
            exhaustMap(({ clientId, onSuccess, onError }) => {
              const masterId = store.masterId();
              if (!masterId) return EMPTY;
              patchState(store, { openingChat: true });
              return chatsApi.ensureChat(masterId, clientId).pipe(
                tapResponse({
                  next: (chat) => {
                    patchState(store, { openingChat: false });
                    onSuccess(chat.id);
                  },
                  error: (e: Error) => {
                    patchState(store, { openingChat: false });
                    onError(e.message);
                  },
                }),
              );
            }),
          ),
        ),

        closeBooking(): void {
          patchWizard({ open: false });
        },

        selectService(subcategoryId: string): void {
          patchWizard({ subcategoryId, error: null });
        },

        selectDay(day: string): void {
          if (store.booking().day === day) return;
          patchWizard({ day, slotId: null, conflicts: null, checking: false });
        },

        selectSlot,

        book: rxMethod<BookOptions>(
          pipe(
            exhaustMap(({ onSuccess, clientId: freshClientId }) => {
              const { subcategoryId, slotId } = store.booking();
              const clientId = freshClientId ?? store.booking().clientId;
              const masterId = store.masterId();
              patchWizard({ submitting: true, error: null });
              if (!clientId || !subcategoryId || !slotId || !masterId) {
                const error = clientId
                  ? 'Выберите услугу и время'
                  : 'Профиль ещё загружается, попробуйте через секунду';
                patchWizard({ submitting: false, error });
                return EMPTY;
              }
              return bookingsApi
                .create({ masterId, clientId, slotId, subcategoryId, createdBy: 'client' })
                .pipe(
                  tapResponse({
                    next: (result) => {
                      patchState(store, { booking: CLOSED_WIZARD });
                      reloadSlots(masterId);
                      onSuccess(result);
                    },
                    error: (e: Error) => {
                      patchWizard({ submitting: false, error: e.message });
                      // The slot may have been taken meanwhile: refresh statuses.
                      reloadSlots(masterId);
                    },
                  }),
                );
            }),
          ),
        ),
      };
    },
  ),
);

export type MasterProfileStore = InstanceType<typeof MasterProfileStore>;
