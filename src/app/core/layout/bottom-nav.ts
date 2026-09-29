import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { NAV_ITEMS } from './nav-items';

/** Mobile/tablet tab bar (design: Карта · Чаты · Профиль). Hidden from lg up. */
@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav class="bottom-nav" aria-label="Основная навигация">
      @for (item of items; track item.path) {
        <a
          class="bottom-nav__item"
          [routerLink]="item.path"
          routerLinkActive="bottom-nav__item--active"
          [routerLinkActiveOptions]="{ exact: item.exact }"
          ariaCurrentWhenActive="page"
        >
          <span class="bottom-nav__icon">
            <app-icon [name]="item.icon" [size]="26" [strokeWidth]="1.75" />
            @if (item.badge === 'unread' && session.unreadTotal() > 0) {
              <span class="bottom-nav__badge">
                {{ session.unreadTotal() }}
                <span class="visually-hidden">непрочитанных</span>
              </span>
            }
          </span>
          <span class="bottom-nav__label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './bottom-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNav {
  protected readonly session = inject(SessionStore);
  protected readonly items = NAV_ITEMS;
}
