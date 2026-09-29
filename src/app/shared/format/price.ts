import { formatNumber } from '@angular/common';
import { Pipe, type PipeTransform } from '@angular/core';
import { APP_LOCALE } from '@app/core/locale';

/**
 * ТЗ 4.2: a price is exact, «от» (from), or free. No ranges, no «по договорённости».
 * Amounts are in BYN.
 */
export type Price =
  { kind: 'exact'; amount: number } | { kind: 'from'; amount: number } | { kind: 'free' };

/** Formats BYN the way the design does: «45 р», «от 30 р», «12,50 р», «Бесплатно». */
export function formatPrice(price: Price | number, opts: { short?: boolean } = {}): string {
  if (typeof price === 'number') return formatAmount(price);
  switch (price.kind) {
    case 'free':
      return opts.short ? '0 р' : 'Бесплатно';
    case 'from':
      return `от ${formatAmount(price.amount)}`;
    case 'exact':
      return formatAmount(price.amount);
  }
}

export function formatAmount(amount: number): string {
  // Non-breaking space so «45 р» never wraps.
  return `${formatNumber(amount, APP_LOCALE, '1.0-2')}\u00a0р`;
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(price: Price | number | null | undefined, short = false): string {
    return price === null || price === undefined ? '' : formatPrice(price, { short });
  }
}
