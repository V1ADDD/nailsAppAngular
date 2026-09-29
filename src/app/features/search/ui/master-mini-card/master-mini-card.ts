import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatDistance } from '@app/core/data/rules';
import { PricePipe } from '@app/shared/format/price';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { type MasterResult } from '../../state/search-logic';

/** Compact card of the collapsed mobile carousel (design 01): photo, name, specialty, price. */
@Component({
  selector: 'app-master-mini-card',
  imports: [RouterLink, Avatar, Icon, PricePipe],
  template: `
    @let m = result().master;
    <a class="mini" [class.mini--active]="active()" [routerLink]="['/masters', m.id]">
      <app-avatar
        [name]="m.name"
        [src]="m.photoUrl"
        [size]="56"
        shape="rounded"
        [online]="m.online"
      />
      <span class="mini__info">
        <span class="mini__name">
          {{ m.name }}
          @if (m.verification === 'verified') {
            <app-icon class="mini__verified" name="badge-check" [size]="14" label="Проверенный" />
          }
        </span>
        <span class="mini__specialty">{{ m.specialty }}</span>
        <span class="mini__meta">
          <span class="mini__price">{{ result().minPrice | price }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ distance() }}</span>
        </span>
      </span>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .mini {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      height: 100%;
      padding: var(--space-3) var(--space-4) var(--space-3) var(--space-3);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: border-color var(--transition-fast);
    }
    .mini--active {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }
    .mini__info {
      display: grid;
      gap: var(--space-0-5);
      min-width: 0;
    }
    .mini__name {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-tight);
    }
    .mini__verified {
      color: var(--color-primary);
    }
    .mini__specialty {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
    }
    .mini__meta {
      display: flex;
      gap: var(--space-1);
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
      white-space: nowrap;
    }
    .mini__price {
      font-weight: var(--font-weight-semibold);
      color: var(--color-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterMiniCard {
  readonly result = input.required<MasterResult>();
  readonly active = input(false);

  protected readonly distance = computed(() => formatDistance(this.result().distanceKm));
}
