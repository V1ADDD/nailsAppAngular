/** Snap states of the mobile results sheet. */
export type SheetSnap = 'collapsed' | 'half' | 'full';

export interface SheetHeights {
  collapsed: number;
  half: number;
  full: number;
}

const HALF_RATIO = 0.5;
const FULL_RATIO = 0.88;
/** How far ahead (ms) a release velocity projects the sheet, like a fling. */
const PROJECTION_MS = 160;

const ORDER: readonly SheetSnap[] = ['collapsed', 'half', 'full'];

/** Pixel heights of every snap for the space `available` above the tab bar. */
export function sheetHeights(available: number, collapsed: number): SheetHeights {
  return {
    collapsed,
    half: Math.max(collapsed, Math.round(available * HALF_RATIO)),
    full: Math.max(collapsed, Math.round(available * FULL_RATIO)),
  };
}

export function clampSheetHeight(height: number, heights: SheetHeights): number {
  return Math.min(heights.full, Math.max(heights.collapsed, height));
}

/**
 * The snap a drag ends on: nearest to the released height, projected forward by the
 * release velocity (px/ms, positive = the sheet grows).
 */
export function resolveSnap(height: number, velocity: number, heights: SheetHeights): SheetSnap {
  const projected = height + velocity * PROJECTION_MS;
  let best: SheetSnap = 'collapsed';
  let bestDistance = Infinity;
  for (const snap of ORDER) {
    const distance = Math.abs(heights[snap] - projected);
    if (distance < bestDistance) {
      best = snap;
      bestDistance = distance;
    }
  }
  return best;
}

/** One step with the keyboard: up grows the sheet, down shrinks it. */
export function stepSnap(snap: SheetSnap, direction: 'up' | 'down'): SheetSnap {
  const index = ORDER.indexOf(snap) + (direction === 'up' ? 1 : -1);
  return ORDER[Math.min(ORDER.length - 1, Math.max(0, index))]!;
}

/** Tap on the handle: open a collapsed sheet, collapse an open one. */
export function toggleSnap(snap: SheetSnap): SheetSnap {
  return snap === 'collapsed' ? 'half' : 'collapsed';
}
