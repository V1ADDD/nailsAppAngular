import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { type IconName } from '@app/shared/ui/icon/icons';
import { Icon } from '@app/shared/ui/icon/icon';

export interface AccountNavItem {
  /** Absolute route of the section, e.g. `/profile/client/bookings`. */
  path: string;
  label: string;
  icon: IconName;
}

/**
 * «Записи · Избранное · Отзывы · Настройки»: links to the section pages — horizontal pills on
 * mobile (as in the design), a vertical menu with icons in the desktop side column.
 */
@Component({
  selector: 'app-account-nav',
  imports: [Icon, RouterLink, RouterLinkActive],
  template: `
    <nav class="nav" aria-label="Разделы кабинета">
      @for (item of items(); track item.path) {
        <a
          class="nav__tab"
          [routerLink]="item.path"
          routerLinkActive="nav__tab--active"
          ariaCurrentWhenActive="page"
        >
          <app-icon class="nav__icon" [name]="item.icon" [size]="20" />
          {{ item.label }}
        </a>
      }
    </nav>
  `,
  styleUrl: './account-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNav {
  readonly items = input.required<readonly AccountNavItem[]>();
}
