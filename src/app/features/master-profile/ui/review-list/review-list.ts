import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { subcategoryName } from '@app/core/data/catalog';
import { type Review } from '@app/core/data/models';
import { PluralPipe } from '@app/shared/format/plural';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Rating } from '@app/shared/ui/rating/rating';
import { REVIEW_FORMS } from '../../state/profile-helpers';
import { ProfileSection } from '../profile-section/profile-section';

const PREVIEW_COUNT = 3;

/** Client reviews about the master: summary, first three, «Показать все». */
@Component({
  selector: 'app-review-list',
  imports: [Avatar, DatePipe, DecimalPipe, PluralPipe, ProfileSection, Rating],
  templateUrl: './review-list.html',
  styleUrl: './review-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewList {
  readonly reviews = input.required<readonly Review[]>();
  readonly average = input(0);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output<void>();

  protected readonly forms = REVIEW_FORMS;
  protected readonly serviceName = subcategoryName;
  protected readonly expanded = signal(false);
  protected readonly visible = computed(() =>
    this.expanded() ? this.reviews() : this.reviews().slice(0, PREVIEW_COUNT),
  );
  protected readonly hasMore = computed(() => this.reviews().length > PREVIEW_COUNT);
}
