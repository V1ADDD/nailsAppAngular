import { computed, effect, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { AccountApi, type AccountSnapshot, ChatsApi } from '@app/core/data/api';
import { USER_LOCATION } from '@app/core/data/fixtures/masters.fixtures';
import { type Role } from '@app/core/data/models';

const STORAGE_KEY = 'nails.session';

interface PersistedSession {
  authenticated: boolean;
  role: Role;
}

interface SessionState extends PersistedSession {
  snapshot: AccountSnapshot | null;
  unreadTotal: number;
  loading: boolean;
  error: string | null;
}

function readPersisted(): PersistedSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { authenticated: false, role: 'client', ...JSON.parse(raw) };
  } catch {
    // Storage unavailable (private mode): fall back to a fresh session.
  }
  return { authenticated: false, role: 'client' };
}

/**
 * The signed-in user (mock auth). One account holds both roles (ТЗ 2.2); `role` is the
 * active mode that decides which chats and which cabinet are shown.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState<SessionState>(() => ({
    ...readPersisted(),
    snapshot: null,
    unreadTotal: 0,
    loading: false,
    error: null,
  })),
  withComputed(({ snapshot, role, authenticated }) => ({
    client: computed(() => snapshot()?.client ?? null),
    master: computed(() => snapshot()?.master ?? null),
    isMaster: computed(() => !!snapshot()?.master),
    favoriteIds: computed(() => new Set(snapshot()?.account.favoriteMasterIds ?? [])),
    /** The active role, falling back to client when the user has no master profile. */
    activeRole: computed<Role>(() =>
      role() === 'master' && snapshot()?.master ? 'master' : 'client',
    ),
    /** Mock geolocation: центр Минска. */
    location: computed(() => USER_LOCATION),
    isGuest: computed(() => !authenticated()),
  })),
  withMethods((store, accountApi = inject(AccountApi), chatsApi = inject(ChatsApi)) => {
    const load = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap(() =>
          accountApi.me().pipe(
            tapResponse({
              next: (snapshot) => patchState(store, { snapshot, loading: false }),
              error: (e: Error) => patchState(store, { error: e.message, loading: false }),
            }),
          ),
        ),
      ),
    );

    const refreshUnread = rxMethod<void>(
      pipe(
        switchMap(() =>
          chatsApi.list(store.activeRole()).pipe(
            tapResponse({
              next: (chats) =>
                patchState(store, { unreadTotal: chats.reduce((sum, c) => sum + c.unread, 0) }),
              error: () => patchState(store, { unreadTotal: 0 }),
            }),
          ),
        ),
      ),
    );

    return {
      load,
      refreshUnread,
      login(): void {
        patchState(store, { authenticated: true });
        load();
      },
      logout(): void {
        patchState(store, { authenticated: false, role: 'client', snapshot: null, unreadTotal: 0 });
      },
      setRole(role: Role): void {
        if (role === store.role()) return;
        patchState(store, { role });
        // The badge counts chats of the active role (ТЗ 2.2).
        if (store.authenticated() && store.snapshot()) refreshUnread();
      },
      setSnapshot(snapshot: AccountSnapshot): void {
        patchState(store, { snapshot });
      },
      toggleFavorite: rxMethod<string>(
        pipe(
          exhaustMap((masterId) =>
            accountApi.toggleFavorite(masterId).pipe(
              tapResponse({
                next: (account) => {
                  const snapshot = store.snapshot();
                  if (snapshot) patchState(store, { snapshot: { ...snapshot, account } });
                },
                error: (e: Error) => patchState(store, { error: e.message }),
              }),
            ),
          ),
        ),
      ),
    };
  }),
  withHooks({
    onInit(store) {
      if (store.authenticated()) store.load();
      // Persist auth + role so a reload keeps the demo session.
      effect(() => {
        const persisted: PersistedSession = {
          authenticated: store.authenticated(),
          role: store.role(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
        } catch {
          // ignore
        }
      });
      // Unread badge follows the active role (ТЗ 2.2: chats are per role).
      effect(() => {
        if (store.authenticated() && store.snapshot()) store.refreshUnread();
      });
    },
  }),
);

export type SessionStore = InstanceType<typeof SessionStore>;
