import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Five-star rating display: ★★★★☆ (214). */
@Component({
  selector: 'app-rating',
  imports: [DecimalPipe],
  template: `
    <span class="rating" [attr.aria-label]="ariaLabel()" role="img">
      <span class="rating__stars" aria-hidden="true">
        @for (fill of stars(); track $index) {
          <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()">
            <defs>
              <linearGradient [attr.id]="gradientId + $index">
                <stop [attr.offset]="fill" stop-color="var(--color-star)" />
                <stop [attr.offset]="fill" stop-color="var(--color-border-strong)" />
              </linearGradient>
            </defs>
            <path
              [attr.fill]="'url(#' + gradientId + $index + ')'"
              d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2 2 0 0 0 1.6 1.2l5.2.7a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.5l-4.6-2.4a2 2 0 0 0-2 0L5.5 21a.5.5 0 0 1-.8-.5l.9-5.2a2 2 0 0 0-.6-1.8L1.2 9.8a.5.5 0 0 1 .3-.9l5.2-.7A2 2 0 0 0 8.3 7z"
            />
          </svg>
        }
      </span>
      @if (showValue()) {
        <span class="rating__value">{{ value() | number: '1.1-1' }}</span>
      }
      @if (count() !== null) {
        <span class="rating__count">({{ count() }})</span>
      }
    </span>
  `,
  styles: `
    .rating {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .rating__stars {
      display: inline-flex;
      gap: 2px;
    }
    .rating__value {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rating {
  private static nextId = 0;
  protected readonly gradientId = `rating-${Rating.nextId++}-`;

  readonly value = input.required<number>();
  readonly count = input<number | null>(null);
  readonly size = input(14);
  readonly showValue = input(false);

  /** Fill fraction per star, e.g. 4.5 → [1, 1, 1, 1, 0.5]. */
  protected readonly stars = computed(() =>
    Array.from({ length: 5 }, (_, i) => Math.min(1, Math.max(0, this.value() - i))),
  );
  protected readonly ariaLabel = computed(() => {
    const value = this.value().toFixed(1).replace('.', ',');
    const count = this.count();
    return count === null ? `Рейтинг ${value} из 5` : `Рейтинг ${value} из 5, отзывов: ${count}`;
  });
}
