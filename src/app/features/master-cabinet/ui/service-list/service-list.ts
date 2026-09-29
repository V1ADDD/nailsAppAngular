import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { categoryOf, subcategoryName } from '@app/core/data/catalog';
import { type MasterService } from '@app/core/data/models';
import { PricePipe } from '@app/shared/format/price';
import { Icon } from '@app/shared/ui/icon/icon';

/** ТЗ 4.2 price list of the master with edit / delete. */
@Component({
  selector: 'app-service-list',
  imports: [PricePipe, Icon],
  template: `
    <ul class="services">
      @for (service of services(); track service.id) {
        <li class="service">
          <div class="service__info">
            <p class="service__name">{{ name(service.subcategoryId) }}</p>
            <p class="service__meta">
              {{ category(service.subcategoryId) }} · {{ service.durationMin }} мин
            </p>
          </div>
          <strong class="service__price">{{ service.price | price }}</strong>
          <div class="service__actions">
            <button
              type="button"
              class="btn btn--icon btn--ghost"
              [attr.aria-label]="'Изменить: ' + name(service.subcategoryId)"
              (click)="edit.emit(service)"
            >
              <app-icon name="pencil" [size]="18" />
            </button>
            <button
              type="button"
              class="btn btn--icon btn--ghost service__delete"
              [attr.aria-label]="'Удалить: ' + name(service.subcategoryId)"
              [disabled]="busy()"
              (click)="remove.emit(service)"
            >
              <app-icon name="trash" [size]="18" />
            </button>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .services {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .service {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    .service__info {
      flex: 1 1 10rem;
      min-width: 0;
    }
    .service__name {
      font-weight: var(--font-weight-semibold);
      overflow-wrap: anywhere;
    }
    .service__meta {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
    }
    .service__price {
      white-space: nowrap;
    }
    .service__actions {
      display: flex;
    }
    .service__delete {
      color: var(--color-danger);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceList {
  readonly services = input.required<readonly MasterService[]>();
  readonly busy = input(false);
  readonly edit = output<MasterService>();
  readonly remove = output<MasterService>();

  protected name(id: string): string {
    return subcategoryName(id);
  }

  protected category(id: string): string {
    return categoryOf(id)?.name ?? '';
  }
}
