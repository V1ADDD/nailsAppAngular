import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type ChatCounterpart } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';

/** Thread header (design 03): back, counterpart, status, and the «…» chat menu (ТЗ 8.6). */
@Component({
  selector: 'app-thread-header',
  imports: [Avatar, Icon, RouterLink],
  host: {
    '(keydown.escape)': 'menuOpen.set(false)',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    @let c = counterpart();
    <a class="back btn btn--icon btn--outline" routerLink="/chats">
      <app-icon name="arrow-left" [size]="22" label="Назад к чатам" />
    </a>
    <app-avatar [name]="c.name" [src]="c.photoUrl" [size]="48" [online]="c.online" />
    <div class="who">
      <div class="who__line">
        <h2 class="who__name">{{ c.name }}</h2>
        @if (c.isMaster) {
          <span class="tag"><span class="tag__dot" aria-hidden="true"></span>Мастер</span>
        }
      </div>
      @if (role() === 'client') {
        <p class="who__status" [class.who__status--online]="c.online">
          {{ c.online ? 'онлайн' : 'не в сети' }}
        </p>
      } @else {
        <p class="who__status">{{ c.subtitle }}</p>
      }
    </div>

    <div class="menu-wrap">
      <button
        type="button"
        class="btn btn--icon btn--ghost"
        aria-haspopup="menu"
        [attr.aria-expanded]="menuOpen()"
        (click)="menuOpen.set(!menuOpen())"
      >
        <app-icon name="more-horizontal" [size]="22" label="Меню чата" />
      </button>
      @if (menuOpen()) {
        <div class="menu" role="menu">
          @if (role() === 'client' && c.isMaster) {
            <a role="menuitem" [routerLink]="['/masters', c.id]">
              <app-icon name="user" [size]="18" /> Профиль мастера
            </a>
          }
          @if (blocked()) {
            <button type="button" role="menuitem" (click)="pick(unblocked)">
              <app-icon name="check" [size]="18" /> Разблокировать
            </button>
          } @else {
            <button type="button" role="menuitem" (click)="pick(blockRequested)">
              <app-icon name="ban" [size]="18" /> Заблокировать
            </button>
          }
          <button
            type="button"
            role="menuitem"
            class="menu__danger"
            (click)="pick(deleteRequested)"
          >
            <app-icon name="trash" [size]="18" /> Удалить чат
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './thread-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadHeader {
  readonly counterpart = input.required<ChatCounterpart>();
  readonly role = input.required<Role>();
  readonly blocked = input(false);

  readonly blockRequested = output<void>();
  readonly unblocked = output<void>();
  readonly deleteRequested = output<void>();

  protected readonly menuOpen = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected pick(target: { emit(value: void): void }): void {
    this.menuOpen.set(false);
    target.emit();
  }

  protected onDocumentClick(event: Event): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
