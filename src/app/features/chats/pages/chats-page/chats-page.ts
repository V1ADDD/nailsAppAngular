import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { type Role } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Segmented, type SegmentedOption } from '@app/shared/ui/segmented/segmented';
import { ChatsStore } from '../../state/chats.store';
import { ChatRow } from '../../ui/chat-row/chat-row';

const ROLE_OPTIONS: SegmentedOption<Role>[] = [
  { value: 'client', label: 'Как клиент' },
  { value: 'master', label: 'Как мастер' },
];

/**
 * /chats: the chat list and the layout shell for the thread (router-outlet).
 * Below md one pane at a time; from md up the list and the thread sit side by side.
 */
@Component({
  selector: 'app-chats-page',
  imports: [ChatRow, Icon, RouterLink, RouterOutlet, Segmented],
  providers: [ChatsStore],
  host: { '[class.has-thread]': 'activeChatId() !== null' },
  templateUrl: './chats-page.html',
  styleUrl: './chats-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatsPage {
  protected readonly store = inject(ChatsStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly roleOptions = ROLE_OPTIONS;
  protected readonly skeletonRows = [1, 2, 3, 4];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeChatId = computed(
    () => /^\/chats\/([^/?#]+)/.exec(this.url())?.[1] ?? null,
  );

  /** Wait for the account so the master role is known before the first request. */
  private readonly listRole = computed(() =>
    this.session.snapshot() ? this.session.activeRole() : null,
  );

  constructor() {
    this.store.load(this.listRole);
    this.store.setActive(this.activeChatId);
  }

  protected setRole(role: Role): void {
    if (role === this.session.activeRole()) return;
    this.session.setRole(role);
    // Threads are per role too (ТЗ 2.2): close the open one.
    if (this.activeChatId()) void this.router.navigate(['/chats']);
  }

  protected retry(): void {
    this.store.load(this.session.activeRole());
  }
}
