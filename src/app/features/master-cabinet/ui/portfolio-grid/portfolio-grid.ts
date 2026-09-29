import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { type PortfolioPhoto } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

/** ТЗ 4.3: up to 9 photos; upload several at once, delete one or a selection. No editing. */
@Component({
  selector: 'app-portfolio-grid',
  imports: [NgOptimizedImage, Icon],
  templateUrl: './portfolio-grid.html',
  styleUrl: './portfolio-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioGrid {
  readonly photos = input.required<readonly PortfolioPhoto[]>();
  readonly limit = input.required<number>();
  readonly busy = input(false);
  readonly add = output<File[]>();
  readonly remove = output<string[]>();
  /** Emitted when the chosen files don't fit into the limit. */
  readonly rejected = output<string>();

  protected readonly selecting = signal(false);
  protected readonly selected = linkedSignal<readonly PortfolioPhoto[], ReadonlySet<string>>({
    source: this.photos,
    computation: () => new Set(),
  });
  protected readonly left = computed(() => Math.max(0, this.limit() - this.photos().length));

  protected placeholder(hue: number): string {
    return `linear-gradient(135deg, hsl(${hue} 70% 86%), hsl(${(hue + 40) % 360} 60% 70%))`;
  }

  protected onFiles(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []).filter((f) => f.type.startsWith('image/'));
    input.value = '';
    if (!files.length) return;
    if (files.length > this.left()) {
      this.rejected.emit(
        this.left()
          ? `Можно добавить ещё ${this.left()} из ${this.limit()} фото — выберите меньше`
          : `В портфолио уже ${this.limit()} фото. Удалите лишние, чтобы добавить новые`,
      );
      return;
    }
    this.add.emit(files);
  }

  protected toggleSelecting(): void {
    this.selecting.update((v) => !v);
    this.selected.set(new Set());
  }

  protected toggle(id: string): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected removeSelected(): void {
    const ids = [...this.selected()];
    if (!ids.length) return;
    this.remove.emit(ids);
    this.selecting.set(false);
  }
}
