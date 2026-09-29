import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ReviewView } from '@app/core/data/api';
import { fmt } from '@app/shared/format/dates';
import { Rating } from '@app/shared/ui/rating/rating';

/** Review card from the design: master name, service (violet), stars + date, text. */
@Component({
  selector: 'app-review-card',
  imports: [Rating],
  template: `
    @let r = review();
    <article class="review">
      <header class="review__head">
        <div class="review__who">
          <h3 class="review__name">{{ r.masterName }}</h3>
          <p class="review__service">{{ r.serviceName }}</p>
        </div>
        <div class="review__meta">
          <app-rating [value]="r.rating" [size]="16" />
          <time class="review__date" [attr.datetime]="r.date">{{ date() }}</time>
        </div>
      </header>
      <p class="review__text">{{ r.text }}</p>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .review {
      display: grid;
      gap: var(--space-3);
      height: 100%;
      padding: var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
    }
    .review__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .review__who {
      min-width: 0;
    }
    .review__name {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      overflow-wrap: anywhere;
    }
    .review__service {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
    }
    .review__meta {
      display: grid;
      flex-shrink: 0;
      justify-items: end;
      gap: var(--space-0-5);
    }
    .review__date {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .review__text {
      color: var(--color-text-secondary);
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewCard {
  readonly review = input.required<ReviewView>();
  protected readonly date = computed(() => fmt(this.review().date, 'd MMM'));
}
