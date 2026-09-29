import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type VerificationStatus } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

/** ТЗ 4.4: identity verification status and request. */
@Component({
  selector: 'app-verification-panel',
  imports: [Icon],
  template: `
    @switch (status()) {
      @case ('verified') {
        <p class="status status--ok" role="status">
          <app-icon name="badge-check" [size]="20" />
          Личность подтверждена — значок виден в вашей карточке.
        </p>
      }
      @case ('pending') {
        <p class="status status--pending" role="status">
          <app-icon name="clock" [size]="20" />
          На проверке у администратора. Обычно это занимает 1–2 рабочих дня.
        </p>
      }
      @default {
        <div class="intro">
          @if (status() === 'rejected') {
            <p class="status status--rejected" role="status">
              <app-icon name="alert-triangle" [size]="20" />
              Проверка не пройдена. Проверьте данные и отправьте заявку ещё раз.
            </p>
          }
          <p>
            Подтвердите личность, чтобы получить значок «Проверенный мастер». Клиенты чаще выбирают
            мастеров со значком. Документы видит только администратор.
          </p>
          <button
            type="button"
            class="btn btn--gradient btn--block"
            [disabled]="busy()"
            (click)="request.emit()"
          >
            <app-icon name="shield-check" [size]="18" /> Подтвердить личность
          </button>
        </div>
      }
    }
  `,
  styles: `
    .intro {
      display: grid;
      gap: var(--space-3);
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    .status {
      display: flex;
      align-items: flex-start;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      border-radius: var(--radius-md);
    }
    .status--ok {
      color: var(--color-success-text);
      background: var(--color-success-soft);
    }
    .status--pending {
      color: var(--color-text);
      background: var(--color-warning-soft);
    }
    .status--rejected {
      color: var(--color-danger);
      background: var(--color-danger-soft);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationPanel {
  readonly status = input.required<VerificationStatus>();
  readonly busy = input(false);
  readonly request = output<void>();
}
