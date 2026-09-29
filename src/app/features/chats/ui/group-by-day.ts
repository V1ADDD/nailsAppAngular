import { type Message } from '@app/core/data/models';
import { addDays, dayKey, fmt } from '@app/shared/format/dates';

export interface MessageDay {
  key: string;
  /** «Сегодня», «Вчера», «28 августа» (with the year when it is not the current one). */
  label: string;
  messages: Message[];
}

export function dayLabel(value: string | Date, now: Date = new Date()): string {
  const key = dayKey(value);
  if (key === dayKey(now)) return 'Сегодня';
  if (key === dayKey(addDays(now, -1))) return 'Вчера';
  const sameYear = fmt(value, 'y') === fmt(now, 'y');
  return fmt(value, sameYear ? 'd MMMM' : 'd MMMM y');
}

/** Groups chronologically sorted messages into Minsk calendar days for day dividers. */
export function groupByDay(messages: readonly Message[], now: Date = new Date()): MessageDay[] {
  const days: MessageDay[] = [];
  for (const message of messages) {
    const key = dayKey(message.sentAt);
    let day = days.at(-1);
    if (day?.key !== key) {
      day = { key, label: dayLabel(message.sentAt, now), messages: [] };
      days.push(day);
    }
    day.messages.push(message);
  }
  return days;
}
