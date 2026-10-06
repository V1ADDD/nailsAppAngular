import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { PluralPipe, plural } from '@app/shared/format/plural';
import { Icon } from '@app/shared/ui/icon/icon';
import { SORT_LABELS, type SortKey } from '../../state/search-logic';
import { type SheetSnap, stepSnap } from './sheet-snap';

/** Pointer travel (px) below which a gesture is a tap, not a drag. */
const TAP_SLOP_PX = 6;

export interface SheetDragEnd {
  /** Total vertical travel, positive = down. */
  dy: number;
  /** Release velocity in px/ms, positive = down. */
  velocity: number;
}

/**
 * «5 мастеров рядом · ● 3 онлайн ^» (design 01) + sort control (ТЗ 5.3). On mobile it is the
 * handle of the bottom sheet: tap, drag or use arrow keys. It only emits gestures; the page
 * owns the sheet height and the snap state.
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
  /** Mobile sheet mode: the header is the sheet's handle. */
  readonly collapsible = input(false);
  readonly snap = input<SheetSnap>('collapsed');
  readonly showSort = input(true);
  readonly sort = input.required<SortKey>();

  readonly sortChange = output<SortKey>();
  readonly handleTap = output<void>();
  readonly snapChange = output<SheetSnap>();
  readonly dragStart = output<void>();
  readonly dragMove = output<number>();
  readonly dragEnd = output<SheetDragEnd>();

  protected readonly sortOptions = Object.entries(SORT_LABELS) as [SortKey, string][];
  protected readonly open = computed(() => this.snap() !== 'collapsed');
  protected readonly label = computed(() => {
    const action = this.open() ? 'Свернуть список мастеров' : 'Открыть список мастеров';
    return `${action}, ${plural(this.count(), ['мастер', 'мастера', 'мастеров'])}`;
  });

  private start: { y: number; t: number; id: number } | null = null;
  private dragging = false;
  private suppressClick = false;

  protected onPointerDown(event: PointerEvent): void {
    if (event.button > 0) return;
    this.start = { y: event.clientY, t: event.timeStamp, id: event.pointerId };
    this.dragging = false;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.start || event.pointerId !== this.start.id) return;
    const dy = event.clientY - this.start.y;
    if (!this.dragging) {
      if (Math.abs(dy) < TAP_SLOP_PX) return;
      this.dragging = true;
      this.dragStart.emit();
    }
    this.dragMove.emit(dy);
  }

  protected onPointerUp(event: PointerEvent): void {
    const start = this.start;
    this.start = null;
    if (!start || !this.dragging) return;
    this.dragging = false;
    // The click that follows a drag must not toggle the sheet again.
    this.suppressClick = true;
    const dy = event.clientY - start.y;
    const ms = Math.max(1, event.timeStamp - start.t);
    this.dragEnd.emit({ dy, velocity: event.type === 'pointercancel' ? 0 : dy / ms });
  }

  protected onClick(): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    this.handleTap.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.snapChange.emit(stepSnap(this.snap(), event.key === 'ArrowUp' ? 'up' : 'down'));
  }

  protected onSort(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value as SortKey);
  }
}
