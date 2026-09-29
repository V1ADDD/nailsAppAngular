import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { BottomNav } from './core/layout/bottom-nav';
import { TopBar } from './core/layout/top-bar';
import { SessionStore } from './core/session/session.store';
import { SupportSheet } from './core/support/support-sheet';
import { ToastOutlet } from './shared/ui/toast/toast-outlet';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopBar, BottomNav, ToastOutlet, SupportSheet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    const session = inject(SessionStore);
    // Refresh the unread badge after every navigation (new messages, read chats).
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (session.authenticated() && session.snapshot()) session.refreshUnread();
      });
  }
}
