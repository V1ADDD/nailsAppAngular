import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AccountApi, type AccountSnapshot, ChatsApi, type ChatSummary } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';
import { SessionStore } from './session.store';

describe('SessionStore', () => {
  const snapshot = {
    account: { id: 'u', clientId: 'c', masterId: 'm', notifications: {}, favoriteMasterIds: [] },
    client: { id: 'c', name: 'Анна' },
    master: { id: 'm', name: 'Анна' },
  } as unknown as AccountSnapshot;
  const unreadByRole: Record<Role, number> = { client: 3, master: 1 };
  const chats = {
    list: jest.fn((role: Role) => of([{ unread: unreadByRole[role] } as ChatSummary])),
  };

  beforeEach(() => {
    localStorage.clear();
    chats.list.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountApi, useValue: { me: () => of(snapshot) } },
        { provide: ChatsApi, useValue: chats },
      ],
    });
  });

  it('recounts the unread badge for the new role on a role switch (ТЗ 2.2)', () => {
    const session = TestBed.inject(SessionStore);
    session.login();
    TestBed.tick();
    expect(session.unreadTotal()).toBe(3);

    session.setRole('master');
    expect(chats.list).toHaveBeenLastCalledWith('master');
    expect(session.unreadTotal()).toBe(1);
  });

  it('falls back to the client role without a master profile', () => {
    const session = TestBed.inject(SessionStore);
    session.setRole('master');
    expect(session.activeRole()).toBe('client');
  });
});
