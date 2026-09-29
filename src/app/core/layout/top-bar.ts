import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { SupportService } from '@app/core/support/support.service';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { NAV_ITEMS } from './nav-items';

/** Desktop header (lg+): brand, navigation, support, account. Replaces the tab bar. */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, RouterLinkActive, Icon, Avatar],
  template: `
    <header class="top-bar">
      <a routerLink="/" class="brand" aria-label="Мастера рядом — на главную">
        <span class="brand__mark" aria-hidden="true">
          <app-icon name="sparkles" [size]="18" />
        </span>
        <span class="brand__name">Мастера рядом</span>
      </a>
      <nav class="top-bar__nav" aria-label="Основная навигация">
        @for (item of items; track item.path) {
          <a
            class="top-bar__link"
            [routerLink]="item.path"
            routerLinkActive="top-bar__link--active"
            [routerLinkActiveOptions]="{ exact: item.exact }"
            ariaCurrentWhenActive="page"
          >
            <app-icon [name]="item.icon" [size]="20" />
            {{ item.label }}
            @if (item.badge === 'unread' && session.unreadTotal() > 0) {
              <span class="top-bar__badge">
                {{ session.unreadTotal() }}<span class="visually-hidden"> непрочитанных</span>
              </span>
            }
          </a>
        }
      </nav>
      <div class="top-bar__actions">
        <button type="button" class="btn btn--ghost btn--sm" (click)="support.open()">
          <app-icon name="message-square" [size]="18" /> Напишите нам
        </button>
        @if (session.client(); as client) {
          <a routerLink="/profile" class="top-bar__me">
            <app-avatar [name]="client.name" [src]="client.photoUrl" [size]="36" />
            <span class="visually-hidden">Профиль</span>
          </a>
        } @else {
          <a routerLink="/login" class="btn btn--primary btn--pill btn--sm">Войти</a>
        }
      </div>
    </header>
  `,
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  protected readonly session = inject(SessionStore);
  protected readonly support = inject(SupportService);
  protected readonly items = NAV_ITEMS;
}
