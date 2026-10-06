import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface TabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/**
 * Tab list in two looks from the design:
 * - `pill`: «Записи / Избранное / Отзывы / Настройки», «День / Неделя / Месяц»
 * - `underline`: «Предстоящие / Прошлые»
 */
@Component({
  selector: 'app-tabs',
  template: `
    <div
      class="tabs"
      [class]="'tabs--' + variant()"
      [class.tabs--stretch]="stretch()"
      role="tablist"
      [attr.aria-label]="label()"
    >
      @for (tab of tabs(); track tab.value) {
        <button
          type="button"
          role="tab"
          class="tabs__tab"
          [attr.aria-selected]="tab.value === value()"
          [attr.tabindex]="tab.value === value() ? 0 : -1"
          (click)="value.set(tab.value)"
          (keydown.arrowRight)="move(1)"
          (keydown.arrowLeft)="move(-1)"
        >
          {{ tab.label }}
          @if (tab.count) {
            <span class="tabs__count">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './tabs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs<T extends string> {
  readonly tabs = input.required<readonly TabOption<T>[]>();
  readonly value = model.required<T>();
  readonly variant = input<'pill' | 'underline'>('pill');
  /** Tabs share the full width (no horizontal scrolling on phones). */
  readonly stretch = input(false);
  readonly label = input<string>('');

  protected move(step: number): void {
    const tabs = this.tabs();
    const index = tabs.findIndex((t) => t.value === this.value());
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (next) this.value.set(next.value);
  }
}
