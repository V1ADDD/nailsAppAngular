import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { type Slot } from '@app/core/data/models';
import { NBSP } from '@app/shared/format/text';
import { type ScheduleRow, buildRows } from '../../state/schedule-logic';
import { ScheduleAgenda } from './schedule-agenda';

const NOW = new Date('2026-10-05T08:00:00+03:00');
const at = (time: string) => new Date(`2026-10-05T${time}:00+03:00`).toISOString();

function freeRows(times: string[]): ScheduleRow[] {
  const slots: Slot[] = times.map((time, i) => ({
    id: `s${i}`,
    masterId: 'm1',
    start: at(time),
    durationMin: 30,
    status: 'free',
    bookingId: null,
  }));
  return buildRows(slots, [], NOW);
}

/** 10:00, 10:30, … */
function halfHours(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const minutes = 10 * 60 + i * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
  });
}

describe('ScheduleAgenda', () => {
  function setup(rows: ScheduleRow[]) {
    TestBed.configureTestingModule({
      providers: [{ provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '+0300' } }],
    });
    const fixture = TestBed.createComponent(ScheduleAgenda);
    fixture.componentRef.setInput('rows', rows);
    const picked: ScheduleRow[] = [];
    fixture.componentInstance.pick.subscribe((row) => picked.push(row));
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const chips = () =>
      Array.from(el.querySelectorAll<HTMLButtonElement>('.free__chip:not(.free__chip--more)'));
    const more = () => el.querySelector<HTMLButtonElement>('.free__chip--more');
    return { fixture, el, picked, chips, more };
  }

  it('shows the free range header with start and end', () => {
    const { el } = setup(freeRows(['10:00', '10:30', '11:00']));
    expect(el.querySelector('.free__range')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Свободно 10:00–11:30',
    );
    expect(el.querySelector('.free__count')?.textContent).toContain(`3${NBSP}окна`);
  });

  it('shows every chip when there are 8 or fewer', () => {
    const { chips, more } = setup(freeRows(halfHours(8)));
    expect(chips()).toHaveLength(8);
    expect(more()).toBeNull();
  });

  it('collapses to 8 chips with «ещё N» and expands on click', () => {
    const { fixture, chips, more } = setup(freeRows(halfHours(11)));
    expect(chips()).toHaveLength(8);
    expect(more()?.textContent?.trim()).toBe('ещё 3');

    more()!.click();
    fixture.detectChanges();

    expect(chips()).toHaveLength(11);
    expect(more()).toBeNull();
  });

  it('emits pick with the row when a chip is clicked', () => {
    const rows = freeRows(['10:00', '10:30']);
    const { chips, picked } = setup(rows);
    chips()[1]!.click();
    expect(picked).toEqual([rows[1]]);
  });

  it('shows a ×N badge for parallel places at the same time', () => {
    const rows = freeRows(['10:00', '10:00', '10:30']);
    const { chips } = setup(rows);
    expect(chips()).toHaveLength(2);
    expect(chips()[0]!.textContent).toContain('×2');
    expect(chips()[0]!.getAttribute('aria-label')).toContain(`2${NBSP}места`);
  });

  it('shows the empty state without rows', () => {
    const { el } = setup([]);
    expect(el.textContent).toContain('На этот день окон нет');
  });
});
