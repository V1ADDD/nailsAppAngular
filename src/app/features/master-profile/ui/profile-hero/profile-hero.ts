import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Master } from '@app/core/data/models';
import { PluralPipe } from '@app/shared/format/plural';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { Rating } from '@app/shared/ui/rating/rating';
import { REVIEW_FORMS, YEAR_FORMS, replyTimeText } from '../../state/profile-helpers';

/** Profile header: photo, name, trust signals, location and the main actions. */
@Component({
  selector: 'app-profile-hero',
  imports: [Avatar, Icon, PluralPipe, Rating, RouterLink],
  templateUrl: './profile-hero.html',
  styleUrl: './profile-hero.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileHero {
  readonly master = input.required<Master>();
  /** Formatted distance from the user, e.g. «1,2 км». */
  readonly distance = input<string | null>(null);
  readonly favorite = input(false);
  /** The signed-in user's own master profile: no booking / messaging. */
  readonly own = input(false);
  readonly messaging = input(false);

  readonly book = output<void>();
  readonly write = output<void>();
  readonly toggleFavorite = output<void>();

  protected readonly yearForms = YEAR_FORMS;
  protected readonly reviewForms = REVIEW_FORMS;
  protected readonly replyText = computed(() => replyTimeText(this.master().replyMinutes));
  protected readonly place = computed(() => {
    const m = this.master();
    return [m.address, m.district, m.city].filter(Boolean).join(', ');
  });
}
