import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SessionStore } from '@app/core/session/session.store';
import { ClientAccountStore } from '../../../state/client-account.store';
import { PanelState } from '../../../ui/panel-state/panel-state';
import { ReviewCard } from '../../../ui/review-card/review-card';

/** «Отзывы» (ТЗ 7.6): the reviews the client wrote, and the ones masters wrote about them. */
@Component({
  selector: 'app-reviews-panel',
  imports: [PanelState, ReviewCard],
  template: `
    @if (store.reviewsLoading() || store.reviewsError()) {
      <app-panel-state [error]="store.reviewsError()" [placeholders]="[1, 2]" (retry)="retry()" />
    } @else {
      <section class="group" aria-labelledby="reviews-written">
        <h2 class="section-caption" id="reviews-written">Мои отзывы</h2>
        @for (review of store.reviews().written; track review.id) {
          <app-review-card [review]="review" />
        } @empty {
          <p class="group__empty">Вы пока не оставляли отзывов</p>
        }
      </section>
      <section class="group" aria-labelledby="reviews-about-me">
        <h2 class="section-caption" id="reviews-about-me">Отзывы обо мне</h2>
        @for (review of store.reviews().aboutMe; track review.id) {
          <app-review-card [review]="review" />
        } @empty {
          <p class="group__empty">Мастера пока не оставляли отзывов о вас</p>
        }
      </section>
    }
  `,
  styles: `
    @use 'styles/breakpoints' as bp;
    :host {
      display: grid;
      align-content: start;
      gap: var(--space-6);
      padding: var(--space-4);
      @include bp.up(md) {
        padding: 0;
      }
    }
    .group {
      display: grid;
      gap: var(--space-3);
    }
    .group__empty {
      padding: var(--space-5);
      text-align: center;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      border: 1px dashed var(--color-border-strong);
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsPanel {
  protected readonly store = inject(ClientAccountStore);
  private readonly session = inject(SessionStore);

  protected retry(): void {
    this.store.loadReviews(this.session.client()?.id ?? null);
  }
}
