import { Pipe, type PipeTransform } from '@angular/core';

const rules = new Intl.PluralRules('ru');

/** Russian word forms: [one, few, many], e.g. ['отзыв', 'отзыва', 'отзывов']. */
export type WordForms = readonly [one: string, few: string, many: string];

export function plural(count: number, forms: WordForms): string {
  const rule = rules.select(count);
  const word = rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];
  return `${count}\u00a0${word}`;
}

/** {{ 5 | plural: ['мастер', 'мастера', 'мастеров'] }} → «5 мастеров» */
@Pipe({ name: 'plural' })
export class PluralPipe implements PipeTransform {
  transform(count: number | null | undefined, forms: WordForms): string {
    return plural(count ?? 0, forms);
  }
}
