import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** Rounded settings card with an uppercase caption («АККАУНТ») and rows projected inside. */
@Component({
  selector: 'app-settings-group',
  template: `
    <section class="group" [attr.aria-labelledby]="captionId">
      <h2 class="section-caption group__caption" [id]="captionId">{{ caption() }}</h2>
      <div class="group__rows">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .group {
      overflow: hidden;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    .group__caption {
      padding: var(--space-4) var(--space-5) var(--space-1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsGroup {
  readonly caption = input.required<string>();
  protected readonly captionId = `settings-group-${nextId++}`;
}
