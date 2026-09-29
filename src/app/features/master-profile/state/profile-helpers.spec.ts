import { type MasterService, type Slot } from '@app/core/data/models';
import { NBSP } from '@app/shared/format/text';
import {
  buildDayOptions,
  formatDuration,
  groupServices,
  groupSlotsByDay,
  replyTimeText,
} from './profile-helpers';

const slot = (id: string, start: string, status: Slot['status'] = 'free'): Slot => ({
  id,
  masterId: 'm1',
  start,
  durationMin: 60,
  status,
  bookingId: null,
});

describe('profile helpers', () => {
  it('formats durations in hours and minutes', () => {
    expect(formatDuration(45)).toBe(`45${NBSP}мин`);
    expect(formatDuration(60)).toBe(`1${NBSP}ч`);
    expect(formatDuration(90)).toBe(`1${NBSP}ч 30${NBSP}мин`);
  });

  it('groups slots by Minsk day in chronological order', () => {
    const days = groupSlotsByDay([
      slot('b', '2026-10-02T08:00:00Z'),
      slot('a', '2026-10-01T07:00:00Z'),
      slot('c', '2026-10-01T10:00:00Z'),
      // 22:30 UTC is already the next day in Minsk (UTC+3).
      slot('d', '2026-10-01T22:30:00Z'),
    ]);
    expect(days.map((d) => d.key)).toEqual(['2026-10-01', '2026-10-02']);
    expect(days[0]!.slots.map((s) => s.id)).toEqual(['a', 'c']);
    expect(days[1]!.slots.map((s) => s.id)).toEqual(['d', 'b']);
  });

  it('builds day options with free slot counts', () => {
    const now = new Date('2026-10-01T06:00:00Z');
    const options = buildDayOptions(
      [
        slot('a', '2026-10-01T07:00:00Z'),
        slot('b', '2026-10-01T09:00:00Z', 'busy'),
        slot('c', '2026-10-03T09:00:00Z'),
      ],
      now,
      3,
    );
    expect(options.map((o) => [o.key, o.free])).toEqual([
      ['2026-10-01', 1],
      ['2026-10-02', 0],
      ['2026-10-03', 1],
    ]);
  });

  it('groups services by catalog category', () => {
    const service = (id: string, subcategoryId: string): MasterService => ({
      id,
      subcategoryId,
      price: { kind: 'exact', amount: 30 },
      durationMin: 60,
    });
    const groups = groupServices(
      [service('1', 'pedicure-spa'), service('2', 'manicure-gel'), service('3', 'manicure-french')],
      ['manicure', 'pedicure'],
    );
    expect(groups.map((g) => g.name)).toEqual(['Маникюр', 'Педикюр']);
    expect(groups[0]!.services.map((s) => s.id)).toEqual(['2', '3']);
  });

  it('describes the typical reply time (ТЗ 1.2)', () => {
    expect(replyTimeText(15)).toBe(`обычно отвечает за 15${NBSP}минут`);
    expect(replyTimeText(60)).toBe('обычно отвечает за час');
    expect(replyTimeText(120)).toBe(`обычно отвечает за 2${NBSP}часа`);
  });
});
