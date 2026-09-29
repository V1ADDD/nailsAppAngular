import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { type Observable, concatMap, exhaustMap, filter, pipe, switchMap, tap } from 'rxjs';
import { BookingsApi, type BookingView, ChatsApi, type ChatThread } from '@app/core/data/api';
import { type Chat, type Message, type Role } from '@app/core/data/models';

export interface ThreadKey {
  chatId: string;
  role: Role;
}

export interface CancelInput {
  bookingId: string;
  reason: string;
  mutual: boolean;
}

interface ChatThreadState {
  key: ThreadKey | null;
  thread: ChatThread | null;
  loading: boolean;
  error: string | null;
  /** Error of the last action (send, cancel, block…), shown inline above the composer. */
  actionError: string | null;
  sending: boolean;
  busy: boolean;
  /** Bumped after every successful change, so the page can refresh unread badges. */
  version: number;
  /** Set once the chat has been deleted; the page navigates back to the list. */
  removed: boolean;
}

const initialState: ChatThreadState = {
  key: null,
  thread: null,
  loading: false,
  error: null,
  actionError: null,
  sending: false,
  busy: false,
  version: 0,
  removed: false,
};

/** One open chat thread: messages, bookings inside the chat (ТЗ 8.2), and chat actions. */
export const ChatThreadStore = signalStore(
  withState(initialState),
  withComputed(({ thread, key }) => ({
    role: computed(() => key()?.role ?? 'client'),
    messages: computed(() => thread()?.messages ?? []),
    bookingsById: computed(
      () => new Map<string, BookingView>((thread()?.bookings ?? []).map((b) => [b.id, b])),
    ),
    blocked: computed(() => !!thread()?.chat.blockedBy),
  })),
  withMethods((store, chats = inject(ChatsApi), bookings = inject(BookingsApi)) => {
    const bump = () => ({ version: store.version() + 1 });
    const fail = (e: Error) =>
      patchState(store, { actionError: e.message, sending: false, busy: false });

    const patchMessage = (message: Message) => {
      const thread = store.thread();
      if (!thread) return;
      const exists = thread.messages.some((m) => m.id === message.id);
      const messages = exists
        ? thread.messages.map((m) => (m.id === message.id ? message : m))
        : [...thread.messages, message];
      patchState(store, {
        thread: { ...thread, messages },
        sending: false,
        busy: false,
        ...bump(),
      });
    };

    const patchChat = (chat: Chat) => {
      const thread = store.thread();
      if (thread) patchState(store, { thread: { ...thread, chat }, busy: false, ...bump() });
    };

    const fetchThread = (key: ThreadKey, silent: boolean) =>
      chats.thread(key.chatId, key.role).pipe(
        tapResponse({
          next: (thread) => {
            patchState(store, { thread, loading: false, busy: false });
            markRead();
          },
          error: (e: Error) =>
            silent ? fail(e) : patchState(store, { error: e.message, loading: false }),
        }),
      );

    /** ТЗ 8: opening a thread marks the counterpart's messages as read. */
    const markRead = rxMethod<void>(
      pipe(
        filter(() => store.key() !== null),
        switchMap(() => {
          const { chatId, role } = store.key()!;
          return chats
            .markRead(chatId, role)
            .pipe(tapResponse({ next: () => patchState(store, bump()), error: () => undefined }));
        }),
      ),
    );

    const reload = rxMethod<void>(
      pipe(
        filter(() => store.key() !== null),
        switchMap(() => fetchThread(store.key()!, true)),
      ),
    );

    /** Runs a booking action, then reloads the thread (system messages, new status). */
    const bookingAction = <T>(call: (input: T, role: Role) => Observable<BookingView>) =>
      rxMethod<T>(
        pipe(
          tap(() => patchState(store, { busy: true, actionError: null })),
          exhaustMap((input) =>
            call(input, store.role()).pipe(
              tapResponse({
                next: () => {
                  patchState(store, bump());
                  reload();
                },
                error: fail,
              }),
            ),
          ),
        ),
      );

    const chatAction = (call: (chatId: string, role: Role) => Observable<Chat>) =>
      rxMethod<void>(
        pipe(
          filter(() => store.key() !== null),
          tap(() => patchState(store, { busy: true, actionError: null })),
          exhaustMap(() =>
            call(store.key()!.chatId, store.role()).pipe(
              tapResponse({ next: patchChat, error: fail }),
            ),
          ),
        ),
      );

    return {
      /** Pass a signal: the thread reloads whenever the chat or the active role changes. */
      load: rxMethod<ThreadKey | null>(
        pipe(
          filter((key): key is ThreadKey => key !== null),
          tap((key) =>
            patchState(store, { ...initialState, key, loading: true, version: store.version() }),
          ),
          switchMap((key) => fetchThread(key, false)),
        ),
      ),
      reload,
      send: rxMethod<{ text?: string; imageUrl?: string }>(
        pipe(
          filter(() => store.key() !== null),
          tap(() => patchState(store, { sending: true, actionError: null })),
          concatMap((content) =>
            chats
              .send(store.key()!.chatId, store.role(), content)
              .pipe(tapResponse({ next: patchMessage, error: fail })),
          ),
        ),
      ),
      edit: rxMethod<{ id: string; text: string }>(
        pipe(
          tap(() => patchState(store, { sending: true, actionError: null })),
          concatMap(({ id, text }) =>
            chats.edit(id, text).pipe(tapResponse({ next: patchMessage, error: fail })),
          ),
        ),
      ),
      remove: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { actionError: null })),
          concatMap((id) =>
            chats.remove(id).pipe(tapResponse({ next: patchMessage, error: fail })),
          ),
        ),
      ),
      confirm: bookingAction<string>((bookingId, role) => bookings.confirm(bookingId, role)),
      cancel: bookingAction<CancelInput>(({ bookingId, reason, mutual }, role) =>
        bookings.cancel(bookingId, role, reason, mutual),
      ),
      block: chatAction((chatId, role) => chats.block(chatId, role)),
      unblock: chatAction((chatId) => chats.unblock(chatId)),
      deleteChat: rxMethod<void>(
        pipe(
          filter(() => store.key() !== null),
          tap(() => patchState(store, { busy: true, actionError: null })),
          exhaustMap(() =>
            chats.deleteChat(store.key()!.chatId).pipe(
              tapResponse({
                next: () => patchState(store, { removed: true, busy: false, ...bump() }),
                error: fail,
              }),
            ),
          ),
        ),
      ),
      dismissError(): void {
        patchState(store, { actionError: null });
      },
    };
  }),
);

export type ChatThreadStore = InstanceType<typeof ChatThreadStore>;
