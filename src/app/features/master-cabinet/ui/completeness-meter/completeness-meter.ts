import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type Completeness } from '../../state/schedule-logic';

/** ТЗ 4.1: profile completeness + «Заполните профиль — будете популярнее». */
@Component({
  selector: 'app-completeness-meter',
  template: `
    <div class="meter">
      <p class="meter__label">
        <span>Профиль заполнен</span>
        <strong>{{ value().percent }}%</strong>
      </p>
      <div
        class="meter__track"
        role="progressbar"
        aria-label="Заполненность профиля"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="value().percent"
      >
        <span class="meter__bar" [style.width.%]="value().percent"></span>
      </div>
      @if (value().missing.length) {
        <p class="meter__hint">
          Заполните профиль — будете популярнее. Не хватает: {{ missingText() }}.
        </p>
      }
    </div>
  `,
  styles: `
    .meter {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--color-primary-soft);
      border-radius: var(--radius-md);
    }
    .meter__label {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
      font-size: var(--font-size-sm);
    }
    .meter__track {
      height: var(--space-2);
      overflow: hidden;
      background: var(--color-surface);
      border-radius: var(--radius-full);
    }
    .meter__bar {
      display: block;
      height: 100%;
      background: var(--gradient-primary);
      border-radius: inherit;
      transition: width var(--transition-base);
    }
    .meter__hint {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompletenessMeter {
  readonly value = input.required<Completeness>();
  protected readonly missingText = computed(() => this.value().missing.join(', '));
}
