import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type PortfolioPhoto } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

/**
 * A portfolio photo, or a soft gradient placeholder tinted by `hue` when the mock photo has
 * no image. Plain <img>: portfolio uploads are blob: URLs, which NgOptimizedImage rejects.
 */
@Component({
  selector: 'app-photo-tile',
  imports: [Icon],
  template: `
    @if (photo().url; as url) {
      <img [src]="url" [alt]="alt()" width="600" height="600" loading="lazy" decoding="async" />
    } @else {
      <span
        class="placeholder"
        role="img"
        [attr.aria-label]="alt()"
        [style.background]="gradient()"
      >
        <app-icon name="image" [size]="iconSize()" />
      </span>
    }
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
      aspect-ratio: 1;
      background: var(--color-surface-muted);
      border-radius: var(--radius-md);
    }
    img,
    .placeholder {
      width: 100%;
      height: 100%;
    }
    img {
      object-fit: cover;
    }
    .placeholder {
      display: grid;
      place-items: center;
      color: var(--color-text-inverse);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoTile {
  readonly photo = input.required<PortfolioPhoto>();
  readonly alt = input('Работа мастера');
  readonly iconSize = input(24);

  // Data-driven tint for mock photos; not a design token by nature.
  protected readonly gradient = computed(() => {
    const h = this.photo().hue;
    return `linear-gradient(135deg, hsl(${h} 70% 82%), hsl(${(h + 40) % 360} 60% 62%))`;
  });
}
