import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type CabinetStats } from '@app/core/data/api';

/** ТЗ 7.3 counters: пришли / не пришли / отменили / предстоит. */
@Component({
  selector: 'app-stats-tiles',
  template: `
    <dl class="tiles">
      @for (tile of tiles(); track tile.label) {
        <div class="tile" [class]="'tile--' + tile.tone">
          <dt>{{ tile.label }}</dt>
          <dd>{{ tile.value }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-2);
      margin: 0;
    }
    .tile {
      display: flex;
      flex-direction: column-reverse;
      gap: var(--space-0-5);
      padding: var(--space-3) var(--space-4);
      background: var(--color-bg);
      border-radius: var(--radius-md);
    }
    dt {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    dd {
      margin: 0;
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-bold);
    }
    .tile--success dd {
      color: var(--color-success-text);
    }
    .tile--danger dd {
      color: var(--color-danger);
    }
    .tile--primary dd {
      color: var(--color-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsTiles {
  readonly stats = input.required<CabinetStats>();

  protected readonly tiles = computed(() => {
    const s = this.stats();
    return [
      { label: 'Пришли', value: s.completed, tone: 'success' },
      { label: 'Не пришли', value: s.noShow, tone: 'danger' },
      { label: 'Отменили', value: s.cancelled, tone: 'muted' },
      { label: 'Предстоит', value: s.upcoming, tone: 'primary' },
    ];
  });
}
