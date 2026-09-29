import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  input,
  output,
} from '@angular/core';
import { type MasterResult } from '../../state/search-logic';
import { MasterCard } from '../master-card/master-card';
import { MasterMiniCard } from '../master-mini-card/master-mini-card';

export type MasterListLayout = 'carousel' | 'list';

export interface BookRequest {
  masterId: string;
  subcategoryId: string | null;
}

/** Result list with loading / empty / error states; scrolls the selected card into view. */
@Component({
  selector: 'app-master-list',
  imports: [MasterCard, MasterMiniCard],
  templateUrl: './master-list.html',
  styleUrl: './master-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-carousel]': 'layout() === "carousel"' },
})
export class MasterList {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly results = input.required<readonly MasterResult[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly layout = input<MasterListLayout>('list');
  readonly selectedId = input<string | null>(null);
  readonly favoriteIds = input<ReadonlySet<string>>(new Set());
  readonly ownId = input<string | null>(null);
  /** Whether any query / filter is applied (the empty state then offers a reset). */
  readonly hasCriteria = input(false);

  readonly book = output<BookRequest>();
  readonly write = output<string>();
  readonly favorite = output<string>();
  readonly hover = output<string | null>();
  readonly retry = output<void>();
  readonly resetFilters = output<void>();

  protected readonly skeletons = [1, 2, 3];

  constructor() {
    afterRenderEffect(() => {
      const id = this.selectedId();
      this.layout();
      if (!id) return;
      const el = this.host.nativeElement.querySelector(`[data-master-id="${CSS.escape(id)}"]`);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el?.scrollIntoView?.({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    });
  }
}
