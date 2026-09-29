import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface Choice<T> {
  value: T;
  label: string;
}

/** Single-choice chip group (radiogroup semantics) used by the filter sheet. */
@Component({
  selector: 'app-choice-group',
  template: `
    <fieldset class="cg">
      <legend class="cg__legend">{{ label() }}</legend>
      <div class="cg__options">
        @for (o of options(); track $index) {
          <label class="chip" [class.chip--active]="o.value === value()">
            <input
              class="visually-hidden"
              type="radio"
              [name]="name()"
              [checked]="o.value === value()"
              (change)="value.set(o.value)"
            />
            {{ o.label }}
          </label>
        }
      </div>
    </fieldset>
  `,
  styles: `
    :host {
      display: block;
    }
    .cg {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      border: none;
    }
    .cg__legend {
      padding: 0;
      margin-bottom: var(--space-2);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-bold);
    }
    .cg__options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .chip {
      cursor: pointer;
    }
    .chip:focus-within {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChoiceGroup<T> {
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly Choice<T>[]>();
  readonly value = model.required<T>();
}
