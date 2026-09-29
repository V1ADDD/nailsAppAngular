import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { type BookingView } from '@app/core/data/api';
import { type ScheduleRow as Row } from '../../state/schedule-logic';
import { ScheduleRow } from './schedule-row';

const bookedRow: Row = {
  id: 's1',
  start: '2026-08-27T06:00:00.000Z', // 09:00 Minsk
  durationMin: 60,
  status: 'booked',
  label: 'Бронь на сайте',
  slot: null,
  booking: { clientName: 'Алина К.', serviceName: 'Маникюр' } as BookingView,
  past: false,
};

function render(row: Row, compact = false) {
  TestBed.configureTestingModule({
    providers: [{ provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { timezone: '+0300' } }],
  });
  const fixture = TestBed.createComponent(ScheduleRow);
  fixture.componentRef.setInput('row', row);
  fixture.componentRef.setInput('compact', compact);
  fixture.detectChanges();
  return fixture;
}

describe('ScheduleRow', () => {
  it('shows «09:00 · client · service · status» with the status color', () => {
    const fixture = render(bookedRow);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('09:00');
    expect(button.textContent).toContain('Алина К.');
    expect(button.textContent).toContain('Маникюр');
    expect(button.textContent).toContain('Бронь на сайте');
    expect(button.classList).toContain('row--booked');
  });

  it('labels free slots and emits the row on click', () => {
    const free: Row = { ...bookedRow, status: 'free', label: 'Свободно', booking: null };
    const fixture = render(free);
    const picked = jest.fn();
    fixture.componentInstance.pick.subscribe(picked);
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Свободное окно');
    button.click();
    expect(picked).toHaveBeenCalledWith(free);
  });

  it('keeps an accessible name in the compact week chip', () => {
    const fixture = render(bookedRow, true);
    const hidden = fixture.nativeElement.querySelector('.visually-hidden');
    expect(hidden.textContent).toContain('Алина К., Бронь на сайте');
  });
});
