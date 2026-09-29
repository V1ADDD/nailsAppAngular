import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { PluralPipe } from '@app/shared/format/plural';
import { Icon } from '@app/shared/ui/icon/icon';
import { SORT_LABELS, type SortKey } from '../../state/search-logic';

const DRAG_THRESHOLD_PX = 30;

/**
 * «5 мастеров рядом · ● 3 онлайн ^» (design 01) + sort control (ТЗ 5.3). On mobile it is the
 * handle of the bottom sheet: tap or drag up/down to expand/collapse.
 */
@Component({
  selector: 'app-list-header',
  imports: [NgTemplateOutlet, Icon, PluralPipe],
  templateUrl: './list-header.html',
  styleUrl: './list-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListHeader {
  readonly count = input.required<number>();
  readonly onlineCount = input(0);
  readonly loading = input(false);
  /** Mobile sheet mode: the header toggles the sheet. */
  readonly collapsible = input(false);
  readonly expanded = model(false);
  readonly showSort = input(true);
  readonly sort = input.required<SortKey>();
  readonly sortChange = output<SortKey>();

  protected readonly sortOptions = Object.entries(SORT_LABELS) as [SortKey, string][];
  private dragStartY: number | null = null;
  private dragged = false;

  protected onPointerDown(event: PointerEvent): void {
    this.dragStartY = event.clientY;
    this.dragged = false;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.dragStartY === null) return;
    const dy = event.clientY - this.dragStartY;
    this.dragStartY = null;
    if (Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    this.dragged = true;
    this.expanded.set(dy < 0);
  }

  protected toggle(): void {
    // A drag already decided the state; ignore the click that follows it.
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    this.expanded.set(!this.expanded());
  }

  protected onSort(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value as SortKey);
  }
}
