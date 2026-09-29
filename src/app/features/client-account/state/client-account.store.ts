import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { type Observable, filter, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import {
  AccountApi,
  type AccountSnapshot,
  type BecomeMasterInput,
  BookingsApi,
  type BookingView,
  ChatsApi,
  MastersApi,
  ReviewsApi,
  type ReviewView,
} from '@app/core/data/api';
import {
  type Account,
  type Client,
  type Master,
  type NotificationSettings,
} from '@app/core/data/models';
import { bookAgainUrl, partitionBookings } from './partition-bookings';

interface ClientAccountState {
  bookingsLoading: boolean;
  bookingsError: string | null;
  masters: Master[];
  mastersLoading: boolean;
  mastersError: string | null;
  reviews: { written: ReviewView[]; aboutMe: ReviewView[] };
  reviewsLoading: boolean;
  reviewsError: string | null;
  /** A mutation (cancel, confirm, save…) is in flight. */
  saving: boolean;
  actionError: string | null;
}

const initialState: ClientAccountState = {
  bookingsLoading: false,
  bookingsError: null,
  masters: [],
  mastersLoading: false,
  mastersError: null,
  reviews: { written: [], aboutMe: [] },
  reviewsLoading: false,
  reviewsError: null,
  saving: false,
  actionError: null,
};

const message = (e: unknown) => (e instanceof Error ? e.message : 'Что-то пошло не так');

/** Client account (ТЗ 7.6): bookings, favorite masters, reviews and account settings. */
export const ClientAccountStore = signalStore(
  withState(initialState),
  withEntities<BookingView>(),
  withComputed(({ entities }) => {
    const groups = computed(() => partitionBookings(entities()));
    return {
      upcoming: computed(() => groups().upcoming),
      past: computed(() => groups().past),
    };
  }),
  withMethods(
    (
      store,
      bookingsApi = inject(BookingsApi),
      mastersApi = inject(MastersApi),
      reviewsApi = inject(ReviewsApi),
      accountApi = inject(AccountApi),
      chatsApi = inject(ChatsApi),
    ) => {
      /** Runs a mutation, tracking `saving`; resolves null and records the error on failure. */
      async function mutate<T>(request: Observable<T>): Promise<T | null> {
        patchState(store, { saving: true, actionError: null });
        try {
          const result = await firstValueFrom(request);
          patchState(store, { saving: false });
          return result;
        } catch (e) {
          patchState(store, { saving: false, actionError: message(e) });
          return null;
        }
      }

      function replaceBooking(booking: BookingView): void {
        patchState(store, updateEntity({ id: booking.id, changes: booking }));
      }

      const loadBookings = rxMethod<string | null>(
        pipe(
          filter((id): id is string => !!id),
          tap(() => patchState(store, { bookingsLoading: true, bookingsError: null })),
          switchMap((clientId) =>
            bookingsApi.forClient(clientId).pipe(
              tapResponse({
                next: (list) => patchState(store, setAllEntities(list), { bookingsLoading: false }),
                error: (e) =>
                  patchState(store, { bookingsError: message(e), bookingsLoading: false }),
              }),
            ),
          ),
        ),
      );

      const loadReviews = rxMethod<string | null>(
        pipe(
          filter((id): id is string => !!id),
          tap(() => patchState(store, { reviewsLoading: true, reviewsError: null })),
          switchMap((clientId) =>
            reviewsApi.forClient(clientId).pipe(
              tapResponse({
                next: (reviews) => patchState(store, { reviews, reviewsLoading: false }),
                error: (e) =>
                  patchState(store, { reviewsError: message(e), reviewsLoading: false }),
              }),
            ),
          ),
        ),
      );

      const loadMasters = rxMethod<void>(
        pipe(
          tap(() => patchState(store, { mastersLoading: true, mastersError: null })),
          switchMap(() =>
            mastersApi.list().pipe(
              tapResponse({
                next: (masters) => patchState(store, { masters, mastersLoading: false }),
                error: (e) =>
                  patchState(store, { mastersError: message(e), mastersLoading: false }),
              }),
            ),
          ),
        ),
      );

      return {
        loadBookings,
        loadReviews,
        loadMasters,
        load(clientId: string): void {
          loadBookings(clientId);
          loadReviews(clientId);
          loadMasters();
        },

        /** ТЗ 6.5: the client cancels with a reason; mutual cancellations have no penalty. */
        async cancel(bookingId: string, reason: string, mutual: boolean): Promise<boolean> {
          const booking = await mutate(bookingsApi.cancel(bookingId, 'client', reason, mutual));
          if (booking) replaceBooking(booking);
          return !!booking;
        },

        /**
         * ТЗ 6.6 (MVP): a reschedule is a cancellation plus a new booking. Cancels and
         * returns the booking-flow URL on the master's profile, or null on failure.
         */
        async reschedule(
          booking: BookingView,
          reason: string,
          mutual = true,
        ): Promise<string | null> {
          const cancelled = await mutate(bookingsApi.cancel(booking.id, 'client', reason, mutual));
          if (!cancelled) return null;
          replaceBooking(cancelled);
          return bookAgainUrl(booking);
        },

        /** ТЗ 6.4: confirms a pending booking the master created. */
        async confirm(bookingId: string): Promise<boolean> {
          const booking = await mutate(bookingsApi.confirm(bookingId, 'client'));
          if (booking) replaceBooking(booking);
          return !!booking;
        },

        /** Chat id for the booking's master, creating the chat when needed. */
        async chatFor(booking: BookingView): Promise<string | null> {
          if (booking.chatId) return booking.chatId;
          if (!booking.clientId) return null;
          const chat = await mutate(chatsApi.ensureChat(booking.masterId, booking.clientId));
          return chat?.id ?? null;
        },

        updateProfile(patch: Partial<Omit<Client, 'id'>>): Promise<Client | null> {
          return mutate(accountApi.updateClient(patch));
        },

        updateNotifications(patch: Partial<NotificationSettings>): Promise<Account | null> {
          return mutate(accountApi.updateNotifications(patch));
        },

        becomeMaster(input: BecomeMasterInput): Promise<AccountSnapshot | null> {
          return mutate(accountApi.becomeMaster(input));
        },

        clearActionError(): void {
          patchState(store, { actionError: null });
        },
      };
    },
  ),
);

export type ClientAccountStore = InstanceType<typeof ClientAccountStore>;
