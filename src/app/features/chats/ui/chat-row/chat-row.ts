import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type ChatSummary } from '@app/core/data/api';
import { ChatTimePipe } from '@app/shared/format/dates';
import { plural } from '@app/shared/format/plural';
import { Avatar } from '@app/shared/ui/avatar/avatar';

/** One row of the chat list (design 02): avatar, name, last message, time, unread count. */
@Component({
  selector: 'app-chat-row',
  imports: [RouterLink, Avatar, ChatTimePipe],
  template: `
    @let s = summary();
    <a
      class="row"
      [routerLink]="['/chats', s.chat.id]"
      [class.row--active]="active()"
      [attr.aria-current]="active() ? 'page' : null"
    >
      <app-avatar
        [name]="s.counterpart.name"
        [src]="s.counterpart.photoUrl"
        [size]="60"
        [badge]="s.counterpart.isMaster"
      />
      <span class="row__body">
        <span class="row__top">
          <span class="row__name">{{ s.counterpart.name }}</span>
          <time class="row__time" [attr.datetime]="s.lastMessage?.sentAt">
            {{ s.lastMessage?.sentAt | chatTime }}
          </time>
        </span>
        <span class="row__bottom">
          <span class="row__preview" [class.row__preview--muted]="s.lastMessage?.deleted">
            {{ s.lastMessagePreview }}
          </span>
          @if (s.unread) {
            <span class="row__unread">
              <span aria-hidden="true">{{ s.unread }}</span>
              <span class="visually-hidden">{{ unreadLabel() }}</span>
            </span>
          }
        </span>
      </span>
    </a>
  `,
  styleUrl: './chat-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatRow {
  readonly summary = input.required<ChatSummary>();
  readonly active = input(false);

  protected unreadLabel(): string {
    return plural(this.summary().unread, [
      'непрочитанное сообщение',
      'непрочитанных сообщения',
      'непрочитанных сообщений',
    ]);
  }
}
