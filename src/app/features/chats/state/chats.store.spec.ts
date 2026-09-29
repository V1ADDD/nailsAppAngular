import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ChatsApi, type ChatSummary } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';
import { ChatsStore } from './chats.store';

function summary(id: string, unread: number): ChatSummary {
  return {
    chat: {
      id,
      masterId: 'm',
      clientId: 'c',
      readAt: { client: '', master: '' },
      blockedBy: null,
    },
    counterpart: {
      id: 'm',
      name: 'Анна',
      photoUrl: null,
      isMaster: true,
      online: true,
      subtitle: '',
    },
    lastMessage: null,
    lastMessagePreview: 'Привет',
    unread,
  };
}

describe('ChatsStore', () => {
  let list: jest.Mock;

  function setup() {
    TestBed.configureTestingModule({
      providers: [ChatsStore, { provide: ChatsApi, useValue: { list } }],
    });
    return TestBed.inject(ChatsStore);
  }

  beforeEach(() => {
    list = jest.fn((role: Role) =>
      of(role === 'client' ? [summary('a', 2), summary('b', 1)] : [summary('x', 0)]),
    );
  });

  it('loads chats of the given role and sums unread counters', () => {
    const store = setup();
    store.load('client');

    expect(list).toHaveBeenCalledWith('client');
    expect(store.entities().map((c) => c.chat.id)).toEqual(['a', 'b']);
    expect(store.totalUnread()).toBe(3);
    expect(store.loading()).toBe(false);
  });

  it('reloads for the other role (ТЗ 2.2: separate chats per role)', () => {
    const store = setup();
    store.load('client');
    store.load('master');

    expect(store.role()).toBe('master');
    expect(store.entities().map((c) => c.chat.id)).toEqual(['x']);
    expect(store.totalUnread()).toBe(0);
  });

  it('ignores a null role until the session is known', () => {
    const store = setup();
    store.load(null);
    expect(list).not.toHaveBeenCalled();
  });

  it('stores the error message', () => {
    list.mockReturnValue(throwError(() => new Error('Нет сети')));
    const store = setup();
    store.load('client');

    expect(store.error()).toBe('Нет сети');
    expect(store.loading()).toBe(false);
  });

  it('refresh reloads the current role without an error state', () => {
    const store = setup();
    store.load('client');
    list.mockReturnValue(of([summary('a', 0)]));
    store.refresh();

    expect(list).toHaveBeenLastCalledWith('client');
    expect(store.totalUnread()).toBe(0);
  });

  it('tracks the active chat', () => {
    const store = setup();
    store.setActive('a');
    expect(store.activeChatId()).toBe('a');
  });
});
