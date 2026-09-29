import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Centered day label between message groups («Сегодня», «Вчера», «28 августа»). */
@Component({
  selector: 'app-day-divider',
  template: `<h3 class="divider">{{ label() }}</h3>`,
  styles: `
    :host {
      display: flex;
      justify-content: center;
      padding: var(--space-2) 0;
    }
    .divider {
      padding: var(--space-1) var(--space-3);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-secondary);
      background: var(--color-surface-muted);
      border-radius: var(--radius-full);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayDivider {
  readonly label = input.required<string>();
}
