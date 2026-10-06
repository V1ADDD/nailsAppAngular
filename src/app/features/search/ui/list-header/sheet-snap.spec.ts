import {
  type SheetHeights,
  clampSheetHeight,
  resolveSnap,
  sheetHeights,
  stepSnap,
  toggleSnap,
} from './sheet-snap';

const heights: SheetHeights = sheetHeights(600, 72);

describe('sheet snap', () => {
  it('computes heights from the available space', () => {
    expect(heights).toEqual({ collapsed: 72, half: 300, full: 528 });
  });

  it('never makes half or full smaller than collapsed', () => {
    expect(sheetHeights(40, 72)).toEqual({ collapsed: 72, half: 72, full: 72 });
  });

  it('clamps a dragged height', () => {
    expect(clampSheetHeight(10, heights)).toBe(72);
    expect(clampSheetHeight(900, heights)).toBe(528);
    expect(clampSheetHeight(200, heights)).toBe(200);
  });

  it('snaps to the nearest state when released slowly', () => {
    expect(resolveSnap(100, 0, heights)).toBe('collapsed');
    expect(resolveSnap(250, 0, heights)).toBe('half');
    expect(resolveSnap(480, 0, heights)).toBe('full');
  });

  it('lets a fling carry the sheet to the next state', () => {
    expect(resolveSnap(150, 1.5, heights)).toBe('half');
    expect(resolveSnap(300, -1.5, heights)).toBe('collapsed');
    expect(resolveSnap(300, 1.5, heights)).toBe('full');
  });

  it('steps with the keyboard and stops at the ends', () => {
    expect(stepSnap('collapsed', 'up')).toBe('half');
    expect(stepSnap('half', 'up')).toBe('full');
    expect(stepSnap('full', 'up')).toBe('full');
    expect(stepSnap('collapsed', 'down')).toBe('collapsed');
  });

  it('toggles between collapsed and open', () => {
    expect(toggleSnap('collapsed')).toBe('half');
    expect(toggleSnap('half')).toBe('collapsed');
    expect(toggleSnap('full')).toBe('collapsed');
  });
});
