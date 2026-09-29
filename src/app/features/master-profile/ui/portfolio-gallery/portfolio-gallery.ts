import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { type PortfolioPhoto } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { Swipe } from '@app/shared/ui/swipe';
import { PhotoTile } from '../photo-tile/photo-tile';
import { ProfileSection } from '../profile-section/profile-section';

const PREVIEW_COUNT = 6;

/** ТЗ 4.3: up to 9 portfolio photos in an expandable grid, with a lightbox. */
@Component({
  selector: 'app-portfolio-gallery',
  imports: [Icon, PhotoTile, ProfileSection, Sheet, Swipe],
  templateUrl: './portfolio-gallery.html',
  styleUrl: './portfolio-gallery.scss',
  host: { '(document:keydown)': 'onKey($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioGallery {
  readonly photos = input.required<readonly PortfolioPhoto[]>();
  readonly masterName = input('');

  protected readonly expanded = signal(false);
  protected readonly current = signal<number | null>(null);
  protected readonly lightboxOpen = computed(() => this.current() !== null);

  protected readonly visible = computed(() =>
    this.expanded() ? this.photos() : this.photos().slice(0, PREVIEW_COUNT),
  );
  protected readonly hiddenCount = computed(() => this.photos().length - PREVIEW_COUNT);
  protected readonly currentPhoto = computed(() => {
    const i = this.current();
    return i === null ? null : (this.photos()[i] ?? null);
  });
  protected readonly lightboxTitle = computed(
    () => `Фото ${(this.current() ?? 0) + 1} из ${this.photos().length}`,
  );

  protected altFor(photo: PortfolioPhoto, index: number): string {
    return photo.caption || `Работа мастера ${this.masterName()}, фото ${index + 1}`.trim();
  }

  protected setLightbox(open: boolean): void {
    if (!open) this.current.set(null);
  }

  protected step(delta: number): void {
    const n = this.photos().length;
    this.current.update((i) => (i === null ? null : (i + delta + n) % n));
  }

  protected onKey(event: KeyboardEvent): void {
    if (!this.lightboxOpen()) return;
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }
}
