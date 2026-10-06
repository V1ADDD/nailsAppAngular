import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Tabs, type TabOption } from '@app/shared/ui/tabs/tabs';
import { ClientAccountStore } from '../../../state/client-account.store';
import { PanelState } from '../../../ui/panel-state/panel-state';
import { ReviewCard } from '../../../ui/review-card/review-card';

export type ReviewsSub = 'written' | 'about';

/**
 * /profile/client/reviews — «Отзывы» (ТЗ 7.6): «Мои отзывы» (left by the client) and
 * «Отзывы обо мне» (written by masters). `?sub=written|about` keeps the open sub-tab.
 */
@Component({
  selector: 'app-reviews-panel',
  imports: [Icon, PanelState, ReviewCard, Tabs],
  template: `
    <h2 class="visually-hidden">Отзывы</h2>
    <div class="reviews__tabs">
      <app-tabs
        variant="underline"
        label="Отзывы"
        [tabs]="subTabs()"
        [value]="activeSub()"
        (valueChange)="selectSub($event)"
      />
    </div>

    <div class="reviews__body">
      @if (store.reviewsLoading() || store.reviewsError()) {
        <app-panel-state [error]="store.reviewsError()" [placeholders]="[1, 2]" (retry)="retry()" />
      } @else {
        <ul class="list">
          @for (review of list(); track review.id) {
            <li><app-review-card [review]="review" /></li>
          }
        </ul>
        @if (list().length === 0) {
          <div class="empty-state">
            <app-icon name="star" [size]="36" />
            @if (activeSub() === 'written') {
              <p class="empty-state__title">Вы пока не оставляли отзывов</p>
              <p>Оценить мастера можно после визита.</p>
            } @else {
              <p class="empty-state__title">Отзывов о вас пока нет</p>
              <p>Мастера смогут оставить отзыв после визита.</p>
            }
          </div>
        }
      }
    </div>
  `,
  styleUrl: './reviews-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewsPanel {
  /** `?sub=` query param (router input binding). */
  readonly sub = input<string>();

  protected readonly store = inject(ClientAccountStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly subTabs = computed<TabOption<ReviewsSub>[]>(() => {
    const { written, aboutMe } = this.store.reviews();
    const ready = !this.store.reviewsLoading() && !this.store.reviewsError();
    return [
      { value: 'written', label: 'Мои отзывы', count: ready ? written.length : undefined },
      { value: 'about', label: 'Отзывы обо мне', count: ready ? aboutMe.length : undefined },
    ];
  });
  protected readonly activeSub = linkedSignal<ReviewsSub>(() =>
    this.sub() === 'about' ? 'about' : 'written',
  );
  protected readonly list = computed(() => {
    const { written, aboutMe } = this.store.reviews();
    return this.activeSub() === 'about' ? aboutMe : written;
  });

  protected selectSub(sub: ReviewsSub): void {
    this.activeSub.set(sub);
    void this.router.navigate([], {
      queryParams: { sub },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected retry(): void {
    this.store.loadReviews(this.session.client()?.id ?? null);
  }
}
