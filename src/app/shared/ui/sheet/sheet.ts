import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Modal built on native <dialog> (focus trap, Esc, inert background for free).
 * Mobile: bottom sheet. From md up: centered dialog.
 */
@Component({
  selector: 'app-sheet',
  imports: [Icon],
  template: `
    <!-- Backdrop click closes; keyboard users get Esc from the native dialog. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <dialog
      #dialog
      class="sheet"
      [attr.aria-labelledby]="titleId"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
    >
      <div class="sheet__panel">
        <span class="sheet__grip" aria-hidden="true"></span>
        <header class="sheet__header">
          <h2 class="sheet__title" [id]="titleId">{{ title() }}</h2>
          <button type="button" class="btn btn--icon btn--ghost" (click)="open.set(false)">
            <app-icon name="x" [size]="20" label="Закрыть" />
          </button>
        </header>
        <div class="sheet__body">
          <ng-content />
        </div>
        <footer class="sheet__footer">
          <ng-content select="[sheetFooter]" />
        </footer>
      </div>
    </dialog>
  `,
  styleUrl: './sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sheet {
  private static nextId = 0;
  protected readonly titleId = `sheet-title-${Sheet.nextId++}`;

  readonly open = model(false);
  readonly title = input.required<string>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal?.();
      if (!this.open() && el.open) el.close();
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    // Clicks on the ::backdrop target the <dialog> element itself.
    if (event.target === this.dialog().nativeElement) this.open.set(false);
  }
}
