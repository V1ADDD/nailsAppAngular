import { type Routes } from '@angular/router';

/** /chats lists chats; /chats/:chatId opens one (side by side from lg up). */
export default [
  {
    path: '',
    loadComponent: () => import('./pages/chats-page/chats-page').then((m) => m.ChatsPage),
    children: [
      {
        path: ':chatId',
        loadComponent: () =>
          import('./pages/chat-thread-page/chat-thread-page').then((m) => m.ChatThreadPage),
      },
    ],
  },
] satisfies Routes;
