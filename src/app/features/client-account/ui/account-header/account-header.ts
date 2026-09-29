import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type Client } from '@app/core/data/models';
import { Avatar } from '@app/shared/ui/avatar/avatar';

/** Client card above the tabs: initials tile, name, phone and the messengers they use. */
@Component({
  selector: 'app-account-header',
  imports: [Avatar],
  template: `
    @if (client(); as c) {
      <app-avatar [name]="c.name" [src]="c.photoUrl" [size]="64" shape="rounded" />
      <div class="header__info">
        <h1 class="header__name">{{ c.name }}</h1>
        <p class="header__phone">{{ c.phone }}</p>
        @if (messengers()) {
          <p class="header__messengers">
            <span class="visually-hidden">Мессенджеры: </span>{{ messengers() }}
          </p>
        }
      </div>
    } @else {
      <span class="skeleton header__tile" aria-hidden="true"></span>
      <div class="header__info" aria-busy="true">
        <span class="visually-hidden">Загружаем профиль…</span>
        <span class="skeleton header__line" aria-hidden="true"></span>
        <span class="skeleton header__line header__line--short" aria-hidden="true"></span>
      </div>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .header__info {
      display: grid;
      flex: 1;
      gap: var(--space-0-5);
      min-width: 0;
    }
    .header__name {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-tight);
      overflow-wrap: anywhere;
    }
    .header__phone {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    .header__messengers {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-primary);
    }
    .header__tile {
      width: var(--space-16);
      height: var(--space-16);
      border-radius: var(--radius-md);
    }
    .header__line {
      height: var(--space-4);
      width: 70%;
    }
    .header__line--short {
      width: 45%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountHeader {
  readonly client = input<Client | null>(null);

  protected readonly messengers = computed(() => {
    const c = this.client();
    if (!c) return '';
    return [c.telegram && 'Telegram', c.viber && 'Viber'].filter(Boolean).join(' · ');
  });
}
