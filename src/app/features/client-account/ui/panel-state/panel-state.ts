import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';

/** Skeleton cards while loading, or an error with a retry button. */
@Component({
  selector: 'app-panel-state',
  imports: [Icon],
  template: `
    @if (error()) {
      <div class="empty-state" role="alert">
        <app-icon name="alert-triangle" [size]="32" />
        <p class="empty-state__title">Не удалось загрузить</p>
        <p>{{ error() }}</p>
        <button type="button" class="btn btn--outline" (click)="retry.emit()">Повторить</button>
      </div>
    } @else {
      <div class="skeletons" aria-busy="true">
        <span class="visually-hidden">Загрузка…</span>
        @for (item of placeholders(); track $index) {
          <span class="skeleton skeletons__item" aria-hidden="true"></span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .skeletons {
      display: grid;
      gap: var(--space-3);
    }
    .skeletons__item {
      height: 7.5rem;
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelState {
  readonly error = input<string | null>(null);
  readonly placeholders = input<readonly number[]>([1, 2, 3]);
  readonly retry = output<void>();
}
