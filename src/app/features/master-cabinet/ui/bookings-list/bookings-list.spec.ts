import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type BookingView } from '@app/core/data/api';
import { type BookingGroup, type ScheduleRow } from '../../state/schedule-logic';
import { BookingsList } from './bookings-list';

function row(id: string, start: string): ScheduleRow {
  return {
    id,
    start,
    durationMin: 60,
    status: 'booked',
    label: 'Бронь на сайте',
    slot: null,
    past: false,
    booking: { id, clientName: `Клиент ${id}`, serviceName: 'Маникюр' } as unknown as BookingView,
  };
}

function group(key: string, month: string, caption: string, rows: ScheduleRow[]): BookingGroup {
  return { key, month, caption, rows };
}

describe('BookingsList', () => {
  let fixture: ComponentFixture<BookingsList>;
  const el = () => fixture.nativeElement as HTMLElement;

  async function setup(groups: BookingGroup[], past = false) {
    fixture = TestBed.createComponent(BookingsList);
    fixture.componentRef.setInput('groups', groups);
    fixture.componentRef.setInput('past', past);
    await fixture.whenStable();
  }

  it('shows a month divider only when the month changes', async () => {
    await setup([
      group('2026-10-06', 'октябрь 2026', 'Сегодня, 6 окт', [row('a', '2026-10-06T07:00:00Z')]),
      group('2026-10-08', 'октябрь 2026', 'Чт, 8 окт', [row('b', '2026-10-08T07:00:00Z')]),
      group('2026-11-02', 'ноябрь 2026', 'Пн, 2 ноя', [row('c', '2026-11-02T07:00:00Z')]),
    ]);
    const months = Array.from(el().querySelectorAll('.list__month')).map((h) => h.textContent);
    expect(months).toEqual(['октябрь 2026', 'ноябрь 2026']);
    expect(el().querySelectorAll('.list__day')).toHaveLength(3);
  });

  it('renders day captions and a row per booking', async () => {
    await setup([
      group('2026-10-06', 'октябрь 2026', 'Сегодня, 6 окт', [
        row('a', '2026-10-06T07:00:00Z'),
        row('b', '2026-10-06T09:00:00Z'),
      ]),
    ]);
    expect(el().querySelector('.list__caption')?.textContent).toBe('Сегодня, 6 окт');
    expect(el().querySelectorAll('app-schedule-row')).toHaveLength(2);
    expect(el().textContent).toContain('Клиент a');
  });

  it('emits pick with the row when a booking is clicked', async () => {
    const target = row('a', '2026-10-06T07:00:00Z');
    await setup([group('2026-10-06', 'октябрь 2026', 'Сегодня, 6 окт', [target])]);
    const spy = jest.fn();
    fixture.componentInstance.pick.subscribe(spy);
    el().querySelector<HTMLElement>('button.row')!.click();
    expect(spy).toHaveBeenCalledWith(target);
  });

  it('shows the upcoming empty state', async () => {
    await setup([]);
    expect(el().textContent).toContain('Предстоящих записей нет');
    expect(el().querySelector('.list')).toBeNull();
  });

  it('shows the past empty state', async () => {
    await setup([], true);
    expect(el().textContent).toContain('Прошлых записей пока нет');
    expect(el().textContent).not.toContain('Предстоящих записей нет');
  });
});
