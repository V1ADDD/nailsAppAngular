import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';

/** Settings row with a chevron that opens a sheet; shows the current value on the right. */
@Component({
  selector: 'app-settings-row',
  imports: [Icon],
  template: `
    <button type="button" class="row" (click)="activate.emit()">
      <span class="row__label">{{ label() }}</span>
      @if (value()) {
        <span class="row__value">{{ value() }}</span>
      }
      <app-icon class="row__chevron" name="chevron-right" [size]="18" />
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    :host(:not(:first-child)) {
      border-top: 1px solid var(--color-border);
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 3.75rem;
      padding: var(--space-3) var(--space-5);
      font-size: var(--font-size-md);
      text-align: start;
      background: transparent;
      border: none;
      transition: background var(--transition-fast);
      &:hover {
        background: var(--color-surface-muted);
      }
      &:focus-visible {
        outline-offset: -2px;
      }
    }
    .row__label {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .row__value {
      font-size: var(--font-size-sm);
      text-align: end;
      color: var(--color-text-secondary);
    }
    .row__chevron {
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRow {
  readonly label = input.required<string>();
  readonly value = input('');
  readonly activate = output<void>();
}
