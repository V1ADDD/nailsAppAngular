import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { entityConfig, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { filter, pipe, switchMap, tap } from 'rxjs';
import { ChatsApi, type ChatSummary } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';

interface ChatsState {
  /** Role the list was loaded for (ТЗ 2.2: chats are separate per role). */
  role: Role | null;
  loading: boolean;
  error: string | null;
  activeChatId: string | null;
}

const chatsConfig = entityConfig({
  entity: type<ChatSummary>(),
  selectId: (summary) => summary.chat.id,
});

/** Chat list of the active role. Provided by ChatsPage and shared with the thread pane. */
export const ChatsStore = signalStore(
  withState<ChatsState>({ role: null, loading: false, error: null, activeChatId: null }),
  withEntities(chatsConfig),
  withComputed(({ entities }) => ({
    totalUnread: computed(() => entities().reduce((sum, c) => sum + c.unread, 0)),
  })),
  withMethods((store, api = inject(ChatsApi)) => {
    const fetch = (role: Role, silent: boolean) =>
      api.list(role).pipe(
        tapResponse({
          next: (chats) =>
            patchState(store, setAllEntities(chats, chatsConfig), { loading: false }),
          error: (e: Error) =>
            patchState(store, silent ? { loading: false } : { error: e.message, loading: false }),
        }),
      );

    return {
      /** Loads the list for a role; pass a signal to reload whenever the role changes. */
      load: rxMethod<Role | null>(
        pipe(
          filter((role): role is Role => role !== null),
          tap((role) => patchState(store, { role, loading: true, error: null })),
          switchMap((role) => fetch(role, false)),
        ),
      ),
      /** Background refresh (after sending / reading) without the skeleton. */
      refresh: rxMethod<void>(
        pipe(
          filter(() => store.role() !== null),
          switchMap(() => fetch(store.role()!, true)),
        ),
      ),
      setActive: rxMethod<string | null>(
        tap((activeChatId) => patchState(store, { activeChatId })),
      ),
    };
  }),
);

export type ChatsStore = InstanceType<typeof ChatsStore>;
