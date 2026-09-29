import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BookingsApi, type BookingView, ChatsApi, type ChatThread } from '@app/core/data/api';
import { type Chat, type Message } from '@app/core/data/models';
import { ChatThreadStore } from './chat-thread.store';

const chat: Chat = {
  id: 'chat-1',
  masterId: 'm',
  clientId: 'c',
  readAt: { client: '', master: '' },
  blockedBy: null,
};

const hello: Message = {
  id: 'm1',
  chatId: 'chat-1',
  kind: 'text',
  author: 'master',
  text: 'Привет',
  sentAt: '2026-09-29T10:00:00Z',
};

function thread(extra: Partial<ChatThread> = {}): ChatThread {
  return {
    chat,
    counterpart: {
      id: 'm',
      name: 'Анна',
      photoUrl: null,
      isMaster: true,
      online: true,
      subtitle: '',
    },
    messages: [hello],
    bookings: [],
    ...extra,
  };
}

describe('ChatThreadStore', () => {
  let chats: Record<keyof ChatsApi, jest.Mock>;
  let bookings: { confirm: jest.Mock; cancel: jest.Mock };

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        ChatThreadStore,
        { provide: ChatsApi, useValue: chats },
        { provide: BookingsApi, useValue: bookings },
      ],
    });
    const store = TestBed.inject(ChatThreadStore);
    store.load({ chatId: 'chat-1', role: 'client' });
    return store;
  }

  beforeEach(() => {
    chats = {
      list: jest.fn(),
      thread: jest.fn(() => of(thread())),
      ensureChat: jest.fn(),
      send: jest.fn((chatId: string, author, content: { text?: string; imageUrl?: string }) =>
        of({ ...hello, id: 'm2', author, ...content }),
      ),
      edit: jest.fn((id: string, text: string) => of({ ...hello, id, text, editedAt: 'now' })),
      remove: jest.fn((id: string) => of({ ...hello, id, text: undefined, deleted: true })),
      markRead: jest.fn(() => of(chat)),
      block: jest.fn((_id: string, by) => of({ ...chat, blockedBy: by })),
      unblock: jest.fn(() => of(chat)),
      deleteChat: jest.fn(() => of(undefined)),
    };
    bookings = {
      confirm: jest.fn(() => of({} as BookingView)),
      cancel: jest.fn(() => of({} as BookingView)),
    };
  });

  it('loads the thread for the role and marks it read', () => {
    const store = setup();

    expect(chats.thread).toHaveBeenCalledWith('chat-1', 'client');
    expect(store.messages()).toEqual([hello]);
    expect(chats.markRead).toHaveBeenCalledWith('chat-1', 'client');
    expect(store.version()).toBeGreaterThan(0);
  });

  it('keeps the API error (e.g. chat of the other role)', () => {
    chats.thread.mockReturnValue(
      throwError(() => new Error('Этот чат доступен в другом режиме профиля')),
    );
    const store = setup();

    expect(store.error()).toContain('другом режиме');
    expect(store.thread()).toBeNull();
  });

  it('sends a message as the active role and appends it', () => {
    const store = setup();
    store.send({ text: 'Здравствуйте' });

    expect(chats.send).toHaveBeenCalledWith('chat-1', 'client', { text: 'Здравствуйте' });
    expect(store.messages().map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(store.sending()).toBe(false);
  });

  it('shows a send error inline', () => {
    chats.send.mockReturnValue(throwError(() => new Error('Чат заблокирован, писать нельзя')));
    const store = setup();
    store.send({ text: 'Эй' });

    expect(store.actionError()).toBe('Чат заблокирован, писать нельзя');
    expect(store.error()).toBeNull();
  });

  it('edits and removes messages in place (ТЗ 8.5)', () => {
    const store = setup();
    store.edit({ id: 'm1', text: 'Добрый день' });
    expect(store.messages()[0]).toMatchObject({ text: 'Добрый день', editedAt: 'now' });

    store.remove('m1');
    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]!.deleted).toBe(true);
  });

  it('confirms and cancels bookings as the active role, then reloads', () => {
    const store = setup();
    store.confirm('b1');
    expect(bookings.confirm).toHaveBeenCalledWith('b1', 'client');

    store.cancel({ bookingId: 'b1', reason: 'Заболела', mutual: true });
    expect(bookings.cancel).toHaveBeenCalledWith('b1', 'client', 'Заболела', true);
    expect(chats.thread).toHaveBeenCalledTimes(3);
  });

  it('blocks and unblocks the chat (ТЗ 8.6)', () => {
    const store = setup();
    store.block();
    expect(chats.block).toHaveBeenCalledWith('chat-1', 'client');
    expect(store.blocked()).toBe(true);

    store.unblock();
    expect(store.blocked()).toBe(false);
  });

  it('flags the chat as removed after deleting', () => {
    const store = setup();
    store.deleteChat();

    expect(chats.deleteChat).toHaveBeenCalledWith('chat-1');
    expect(store.removed()).toBe(true);
  });

  it('indexes bookings by id', () => {
    chats.thread.mockReturnValue(of(thread({ bookings: [{ id: 'b1' } as BookingView] })));
    const store = setup();
    expect(store.bookingsById().get('b1')?.id).toBe('b1');
  });
});
