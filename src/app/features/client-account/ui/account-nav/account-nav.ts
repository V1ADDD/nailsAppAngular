import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { type IconName } from '@app/shared/ui/icon/icons';
import { Icon } from '@app/shared/ui/icon/icon';

export type AccountTab = 'bookings' | 'favorites' | 'reviews' | 'settings';

export interface AccountTabOption {
  value: AccountTab;
  label: string;
  icon: IconName;
}

export const accountTabId = (tab: AccountTab) => `account-tab-${tab}`;
export const accountPanelId = (tab: AccountTab) => `account-panel-${tab}`;

/**
 * «Записи · Избранное · Отзывы · Настройки»: horizontal pills on mobile (as in the design),
 * a vertical menu with icons in the desktop side column.
 */
@Component({
  selector: 'app-account-nav',
  imports: [Icon],
  template: `
    <div class="nav" role="tablist" aria-label="Разделы кабинета">
      @for (tab of tabs(); track tab.value) {
        <button
          type="button"
          role="tab"
          class="nav__tab"
          [id]="tabId(tab.value)"
          [attr.aria-controls]="panelId(tab.value)"
          [attr.aria-selected]="tab.value === value()"
          [attr.tabindex]="tab.value === value() ? 0 : -1"
          (click)="value.set(tab.value)"
          (keydown.arrowRight)="move($event, 1)"
          (keydown.arrowDown)="move($event, 1)"
          (keydown.arrowLeft)="move($event, -1)"
          (keydown.arrowUp)="move($event, -1)"
        >
          <app-icon class="nav__icon" [name]="tab.icon" [size]="20" />
          {{ tab.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './account-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountNav {
  readonly tabs = input.required<readonly AccountTabOption[]>();
  readonly value = model.required<AccountTab>();

  protected readonly tabId = accountTabId;
  protected readonly panelId = accountPanelId;

  protected move(event: Event, step: number): void {
    event.preventDefault();
    const tabs = this.tabs();
    const index = tabs.findIndex((t) => t.value === this.value());
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    this.value.set(next.value);
    const target = (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(
      `#${accountTabId(next.value)}`,
    );
    target?.focus();
  }
}
