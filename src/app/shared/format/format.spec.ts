import '@app/core/locale';
import { chatTime, fmt, relativeDay } from './dates';
import { plural } from './plural';
import { formatPrice } from './price';
import { NBSP } from './text';

const clean = (s: string) => s.split(NBSP).join(' ');

describe('formatPrice', () => {
  it('formats exact, «от» and free prices in BYN like the design', () => {
    expect(clean(formatPrice({ kind: 'exact', amount: 45 }))).toBe('45 р');
    expect(clean(formatPrice({ kind: 'from', amount: 30 }))).toBe('от 30 р');
    expect(clean(formatPrice({ kind: 'exact', amount: 12.5 }))).toBe('12,5 р');
    expect(formatPrice({ kind: 'free' })).toBe('Бесплатно');
    expect(clean(formatPrice({ kind: 'free' }, { short: true }))).toBe('0 р');
  });
});

describe('plural', () => {
  it('uses Russian plural forms', () => {
    const forms = ['отзыв', 'отзыва', 'отзывов'] as const;
    expect(clean(plural(1, forms))).toBe('1 отзыв');
    expect(clean(plural(3, forms))).toBe('3 отзыва');
    expect(clean(plural(5, forms))).toBe('5 отзывов');
    expect(clean(plural(21, forms))).toBe('21 отзыв');
    expect(clean(plural(214, forms))).toBe('214 отзывов');
  });
});

describe('dates', () => {
  // Tuesday 29 Sep 2026, 15:00 Minsk
  const now = new Date('2026-09-29T12:00:00.000Z');

  it('drops the dot from Russian month abbreviations', () => {
    expect(fmt('2026-08-28T07:00:00.000Z', 'd MMM')).toBe('28 авг');
    expect(fmt('2026-09-29T07:00:00.000Z', 'd MMM')).toBe('29 сен');
    expect(fmt('2026-09-29T07:00:00.000Z', 'd MMMM')).toBe('29 сентября');
  });

  it('formats chat list times', () => {
    expect(chatTime('2026-09-29T11:32:00.000Z', now)).toBe('14:32');
    expect(chatTime('2026-09-28T11:32:00.000Z', now)).toBe('Вчера');
    expect(chatTime('2026-09-26T11:32:00.000Z', now)).toBe('Сб');
    expect(chatTime('2026-08-12T11:32:00.000Z', now)).toBe('12 авг');
  });

  it('uses Minsk days for today/tomorrow', () => {
    expect(relativeDay('2026-09-29T20:30:00.000Z', now)).toBe('Сегодня'); // 23:30 in Minsk
    expect(relativeDay('2026-09-29T21:30:00.000Z', now)).toBe('Завтра'); // 00:30 next day in Minsk
    expect(relativeDay('2026-09-28T09:00:00.000Z', now)).toBe('Вчера');
  });
});
