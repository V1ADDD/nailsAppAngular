import { type Message } from '@app/core/data/models';
import { dayLabel, groupByDay } from './group-by-day';

const now = new Date('2026-09-29T12:00:00+03:00');

function msg(id: string, sentAt: string): Message {
  return { id, chatId: 'c', kind: 'text', author: 'client', text: id, sentAt };
}

describe('groupByDay', () => {
  it('groups consecutive messages by Minsk calendar day with labels', () => {
    const days = groupByDay(
      [
        msg('a', '2026-08-28T10:00:00+03:00'),
        msg('b', '2026-09-28T09:00:00+03:00'),
        msg('c', '2026-09-28T23:30:00+03:00'),
        msg('d', '2026-09-29T00:10:00+03:00'),
      ],
      now,
    );

    expect(days.map((d) => d.label)).toEqual(['28 августа', 'Вчера', 'Сегодня']);
    expect(days.map((d) => d.messages.map((m) => m.id))).toEqual([['a'], ['b', 'c'], ['d']]);
  });

  it('uses the Minsk day, not UTC, near midnight', () => {
    // 22:30 UTC on the 28th is 01:30 on the 29th in Minsk.
    expect(groupByDay([msg('a', '2026-09-28T22:30:00Z')], now)[0]!.label).toBe('Сегодня');
  });

  it('returns no groups for no messages', () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it('adds the year for other years', () => {
    expect(dayLabel('2025-12-31T12:00:00+03:00', now)).toBe('31 декабря 2025');
  });
});
