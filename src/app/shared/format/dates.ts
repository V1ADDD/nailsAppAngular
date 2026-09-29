import { formatDate } from '@angular/common';
import { Pipe, type PipeTransform } from '@angular/core';
import { APP_LOCALE } from '@app/core/locale';

const TZ = '+0300'; // Europe/Minsk, no DST

export function fmt(date: Date | string | number, format: string): string {
  // ru month abbreviations carry a dot («авг.»); the design drops it («28 авг»).
  return formatDate(date, format, APP_LOCALE, TZ).replace(/\./g, '');
}

/** Minsk calendar day key, e.g. '2026-09-29'. */
export function dayKey(date: Date | string | number): string {
  return formatDate(date, 'yyyy-MM-dd', APP_LOCALE, TZ);
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return dayKey(a) === dayKey(b);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Chat list time: «14:32» today, «Вчера», «Пн» within a week, else «12 авг». */
export function chatTime(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  if (isSameDay(date, now)) return fmt(date, 'HH:mm');
  if (isSameDay(date, addDays(now, -1))) return 'Вчера';
  const ageDays = (now.getTime() - date.getTime()) / 86_400_000;
  if (ageDays < 7) {
    const weekday = fmt(date, 'EEEEEE'); // «пн»
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
  return fmt(date, 'd MMM');
}

/** «Сегодня», «Завтра», or «пт, 2 окт». */
export function relativeDay(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  if (isSameDay(date, now)) return 'Сегодня';
  if (isSameDay(date, addDays(now, 1))) return 'Завтра';
  if (isSameDay(date, addDays(now, -1))) return 'Вчера';
  return fmt(date, 'EEEEEE, d MMM');
}

@Pipe({ name: 'chatTime' })
export class ChatTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return value ? chatTime(value) : '';
  }
}

/** Short booking date as in the design: «28 авг · 10:00». */
@Pipe({ name: 'slotDate' })
export class SlotDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, withYear = false): string {
    if (!value) return '';
    return `${fmt(value, withYear ? 'd MMM y' : 'd MMM')}\u00a0·\u00a0${fmt(value, 'HH:mm')}`;
  }
}

@Pipe({ name: 'relativeDay' })
export class RelativeDayPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return value ? relativeDay(value) : '';
  }
}
