import { Directive, ElementRef, inject, input, output } from '@angular/core';

const MIN_DISTANCE_PX = 50;

/**
 * Emits swipeLeft/swipeRight for horizontal pointer swipes (ТЗ: «через свайп» for
 * day/week/month and client/master switching). Vertical scrolling is left alone.
 */
@Directive({
  selector: '[appSwipe]',
  host: {
    '(pointerdown)': 'onDown($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'start = null',
    '[style.touch-action]': '"pan-y"',
  },
})
export class Swipe {
  readonly swipeDisabled = input(false);
  readonly swipeLeft = output<void>();
  readonly swipeRight = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected start: { x: number; y: number } | null = null;

  protected onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return; // swipes are a touch gesture
    // The innermost swipe area wins: a day/week/month swipe must not also switch roles.
    const owner = (event.target as Element | null)?.closest?.('[appSwipe]');
    if (owner && owner !== this.host) return;
    this.start = { x: event.clientX, y: event.clientY };
  }

  protected onUp(event: PointerEvent): void {
    if (!this.start || this.swipeDisabled()) return;
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    this.start = null;
    if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) this.swipeLeft.emit();
    else this.swipeRight.emit();
  }
}
