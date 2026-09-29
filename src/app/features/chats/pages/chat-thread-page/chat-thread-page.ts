import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type Message, type Role } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { ChatThreadStore, type ThreadKey } from '../../state/chat-thread.store';
import { ChatsStore } from '../../state/chats.store';
import { CancelSheet, type CancelSubmit } from '../../ui/cancel-sheet/cancel-sheet';
import { Composer, type ComposerSend } from '../../ui/composer/composer';
import { MessageList } from '../../ui/message-list/message-list';
import { ThreadHeader } from '../../ui/thread-header/thread-header';

const OTHER_ROLE_ERROR = 'другом режиме';

/** /chats/:chatId — one chat with bookings inside (ТЗ 8). */
@Component({
  selector: 'app-chat-thread-page',
  imports: [CancelSheet, Composer, Icon, MessageList, RouterLink, Sheet, ThreadHeader],
  providers: [ChatThreadStore],
  templateUrl: './chat-thread-page.html',
  styleUrl: './chat-thread-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatThreadPage {
  readonly chatId = input.required<string>();

  protected readonly store = inject(ChatThreadStore);
  protected readonly session = inject(SessionStore);
  private readonly list = inject(ChatsStore, { optional: true });
  private readonly router = inject(Router);

  protected readonly editing = signal<Message | null>(null);
  protected readonly cancelBookingId = signal<string | null>(null);
  protected readonly cancelOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly imageOpen = signal(false);

  private readonly key = computed<ThreadKey | null>(
    () =>
      this.session.snapshot() ? { chatId: this.chatId(), role: this.session.activeRole() } : null,
    // Reload only when the chat or the role changes, not on every snapshot update.
    { equal: (a, b) => a?.chatId === b?.chatId && a?.role === b?.role },
  );

  /** The chat exists but belongs to the other role (ТЗ 2.2). */
  protected readonly otherRole = computed<Role | null>(() => {
    if (!this.store.error()?.includes(OTHER_ROLE_ERROR) || !this.session.isMaster()) return null;
    return this.session.activeRole() === 'client' ? 'master' : 'client';
  });

  constructor() {
    this.store.load(this.key);

    // Side effects outside this store: refresh the nav badge and the list preview.
    effect(() => {
      if (this.store.version() === 0) return;
      untracked(() => {
        this.session.refreshUnread();
        this.list?.refresh();
      });
    });
    effect(() => {
      if (this.store.removed()) untracked(() => void this.router.navigate(['/chats']));
    });
  }

  protected onSend(content: ComposerSend): void {
    this.store.send(content);
  }

  protected onEditSaved(edit: { id: string; text: string }): void {
    this.store.edit(edit);
    this.editing.set(null);
  }

  protected onRemove(message: Message): void {
    if (this.editing()?.id === message.id) this.editing.set(null);
    this.store.remove(message.id);
  }

  protected openCancel(bookingId: string): void {
    this.cancelBookingId.set(bookingId);
    this.cancelOpen.set(true);
  }

  protected onCancelSubmit({ reason, mutual }: CancelSubmit): void {
    const bookingId = this.cancelBookingId();
    if (bookingId) this.store.cancel({ bookingId, reason, mutual });
    this.cancelOpen.set(false);
  }

  protected openImage(url: string): void {
    this.imageUrl.set(url);
    this.imageOpen.set(true);
  }

  protected confirmDelete(): void {
    this.deleteOpen.set(false);
    this.store.deleteChat();
  }

  protected switchRole(role: Role): void {
    this.session.setRole(role);
  }

  protected roleLabel(role: Role): string {
    return role === 'master' ? 'мастера' : 'клиента';
  }
}
