import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** iOS-style segmented switch (design: «Клиент | Мастер»). */
@Component({
  selector: 'app-segmented',
  template: `
    <div class="segmented" role="radiogroup" [attr.aria-label]="label()">
      @for (option of options(); track option.value) {
        <button
          type="button"
          role="radio"
          class="segmented__option"
          [attr.aria-checked]="option.value === value()"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .segmented {
      display: inline-flex;
      gap: var(--space-1);
      padding: var(--space-1);
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
    }
    .segmented__option {
      min-width: 6.5rem;
      min-height: 2.5rem;
      padding: var(--space-2) var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
      color: var(--color-text-muted);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }
    .segmented__option[aria-checked='true'] {
      color: var(--color-text);
      background: var(--color-surface);
      box-shadow: var(--shadow-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Segmented<T extends string> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = model.required<T>();
  readonly label = input<string>('');
}
