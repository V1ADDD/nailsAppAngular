import { type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map, of } from 'rxjs';

/** `mediaQuery('(min-width: 768px)')` → a signal that follows the media query. */
export function mediaQuery(query: string): Signal<boolean> {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
  return toSignal(
    mq ? fromEvent<MediaQueryListEvent>(mq, 'change').pipe(map((e) => e.matches)) : of(false),
    { initialValue: mq?.matches ?? false },
  );
}

/** Same values as styles/_breakpoints.scss. */
export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024, xl: 1280 } as const;

export const upFrom = (name: keyof typeof BREAKPOINTS) =>
  mediaQuery(`(min-width: ${BREAKPOINTS[name]}px)`);
