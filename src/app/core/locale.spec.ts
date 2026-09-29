import { formatCurrency, formatDate, getCurrencySymbol } from '@angular/common';
import { APP_CURRENCY, APP_LOCALE } from './locale';

describe('app locale', () => {
  it('formats BYN prices the Belarusian way', () => {
    const symbol = getCurrencySymbol(APP_CURRENCY, 'narrow', APP_LOCALE);
    const formatted = formatCurrency(45.5, APP_LOCALE, symbol, APP_CURRENCY);
    expect(formatted.replace(/\s/g, ' ')).toBe('45,50 Br');
  });

  it('formats dates in Russian in Minsk time', () => {
    const formatted = formatDate('2026-10-02T11:30:00Z', 'd MMMM, HH:mm', APP_LOCALE, '+0300');
    expect(formatted).toBe('2 октября, 14:30');
  });
});
