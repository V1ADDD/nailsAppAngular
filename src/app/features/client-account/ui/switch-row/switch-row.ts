import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Accessible toggle row: the whole row is a `role="switch"` button. */
@Component({
  selector: 'app-switch-row',
  template: `
    <button
      type="button"
      role="switch"
      class="row"
      [attr.aria-checked]="checked()"
      [disabled]="disabled()"
      (click)="toggled.emit(!checked())"
    >
      <span class="row__text">
        <span class="row__label">{{ label() }}</span>
        @if (hint()) {
          <span class="row__hint">{{ hint() }}</span>
        }
      </span>
      <span class="track" aria-hidden="true"><span class="thumb"></span></span>
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
      text-align: start;
      background: transparent;
      border: none;
      transition: background var(--transition-fast);
      &:hover:not(:disabled) {
        background: var(--color-surface-muted);
      }
      &:focus-visible {
        outline-offset: -2px;
      }
      &:disabled {
        cursor: progress;
      }
    }
    .row__text {
      display: grid;
      flex: 1;
      min-width: 0;
    }
    .row__label {
      font-size: var(--font-size-md);
    }
    .row__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }
    .track {
      position: relative;
      flex-shrink: 0;
      width: 2.75rem;
      height: 1.625rem;
      background: var(--color-border-strong);
      border-radius: var(--radius-full);
      transition: background var(--transition-base);
    }
    .thumb {
      position: absolute;
      top: var(--space-0-5);
      left: var(--space-0-5);
      width: 1.375rem;
      height: 1.375rem;
      background: var(--color-surface);
      border-radius: var(--radius-full);
      box-shadow: var(--shadow-sm);
      transition: transform var(--transition-base);
    }
    .row[aria-checked='true'] .track {
      background: var(--color-primary);
    }
    .row[aria-checked='true'] .thumb {
      transform: translateX(1.125rem);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwitchRow {
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly toggled = output<boolean>();
}
