import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-outlet',
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="false">
      @for (toast of toasts.messages(); track toast.id) {
        <div class="toast" [class]="'toast toast--' + toast.kind" role="status">
          <span>{{ toast.text }}</span>
          <button type="button" class="toast__close" (click)="toasts.dismiss(toast.id)">
            <span class="visually-hidden">Закрыть уведомление</span>×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      inset: auto var(--space-4) calc(var(--bottom-nav-height) + var(--space-4));
      z-index: var(--z-toast);
      display: grid;
      justify-items: center;
      gap: var(--space-2);
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      max-width: 28rem;
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-inverse);
      background: var(--color-text);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      pointer-events: auto;
    }
    .toast--success {
      background: var(--color-success-text);
    }
    .toast--error {
      background: var(--color-danger);
    }
    .toast__close {
      font-size: var(--font-size-lg);
      line-height: 1;
      color: inherit;
      background: none;
      border: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);
}
