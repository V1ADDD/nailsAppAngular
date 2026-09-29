import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Master } from '@app/core/data/models';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { Rating } from '@app/shared/ui/rating/rating';

/** Favorite master: photo, name + verified badge, specialty, rating; heart removes it. */
@Component({
  selector: 'app-favorite-card',
  imports: [Avatar, Icon, Rating, RouterLink],
  template: `
    @let m = master();
    <article class="fav">
      <a class="fav__link" [routerLink]="['/masters', m.id]">
        <app-avatar [name]="m.name" [src]="m.photoUrl" [size]="60" shape="rounded" />
        <div class="fav__info">
          <div class="fav__name">
            <h3 class="fav__title">{{ m.name }}</h3>
            @if (m.verification === 'verified') {
              <app-icon
                class="fav__badge"
                name="badge-check"
                [size]="18"
                label="Проверенный мастер"
              />
            }
          </div>
          <span class="fav__specialty">{{ m.specialty }}</span>
          <app-rating [value]="m.rating" [count]="m.reviewsCount" />
        </div>
      </a>
      <button
        type="button"
        class="btn btn--icon btn--ghost fav__heart"
        aria-pressed="true"
        [attr.aria-label]="'Убрать ' + m.name + ' из избранного'"
        (click)="remove.emit()"
      >
        <app-icon name="heart" [size]="24" [filled]="true" />
      </button>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .fav {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      height: 100%;
      padding: var(--space-4) var(--space-3) var(--space-4) var(--space-5);
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      transition: box-shadow var(--transition-fast);
      &:hover {
        box-shadow: var(--shadow-md);
      }
    }
    .fav__link {
      display: flex;
      flex: 1;
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
      border-radius: var(--radius-md);
    }
    .fav__info {
      display: grid;
      gap: var(--space-0-5);
      min-width: 0;
    }
    .fav__name {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);
    }
    .fav__title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-tight);
      overflow-wrap: anywhere;
    }
    .fav__badge,
    .fav__specialty,
    .fav__heart {
      color: var(--color-primary);
    }
    .fav__specialty {
      font-size: var(--font-size-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoriteCard {
  readonly master = input.required<Master>();
  readonly remove = output<void>();
}
