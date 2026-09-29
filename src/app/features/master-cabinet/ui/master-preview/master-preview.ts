import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type Master } from '@app/core/data/models';
import { Avatar } from '@app/shared/ui/avatar/avatar';
import { Icon } from '@app/shared/ui/icon/icon';
import { Rating } from '@app/shared/ui/rating/rating';

/** How clients see the master's card (ТЗ 4.1). */
@Component({
  selector: 'app-master-preview',
  imports: [Avatar, Rating, Icon],
  template: `
    <div class="preview">
      <app-avatar [name]="master().name" [src]="master().photoUrl" [size]="80" shape="rounded" />
      <div class="preview__info">
        <p class="preview__name">
          {{ master().name }}
          @if (master().verification === 'verified') {
            <app-icon
              class="preview__verified"
              name="badge-check"
              [size]="18"
              label="Личность подтверждена"
            />
          }
        </p>
        <p class="preview__specialty">{{ master().specialty }}</p>
        <app-rating [value]="master().rating" [count]="master().reviewsCount" />
      </div>
    </div>
  `,
  styles: `
    .preview {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }
    .preview__info {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }
    .preview__name {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      overflow-wrap: anywhere;
    }
    .preview__verified {
      color: var(--color-success);
    }
    .preview__specialty {
      font-size: var(--font-size-sm);
      color: var(--color-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterPreview {
  readonly master = input.required<Master>();
}
