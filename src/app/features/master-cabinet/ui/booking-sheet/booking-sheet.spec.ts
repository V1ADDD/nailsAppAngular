import '@app/core/locale';
import { TestBed } from '@angular/core/testing';
import { type BookingView } from '@app/core/data/api';
import { type ScheduleRow } from '../../state/schedule-logic';
import { BookingSheet } from './booking-sheet';

const booking = {
  id: 'b1',
  clientId: 'c1',
  clientName: 'Алина К.',
  clientPhotoUrl: null,
  serviceName: 'Маникюр',
  price: { kind: 'exact', amount: 45 },
  start: '2030-08-27T06:00:00.000Z',
  durationMin: 60,
  status: 'pending',
  source: 'site',
  createdBy: 'client',
} as BookingView;

function row(partial: Partial<BookingView> = {}, past = false): ScheduleRow {
  return {
    id: 's1',
    start: booking.start,
    durationMin: 60,
    status: 'pending',
    label: 'Ожидает подтверждения',
    slot: null,
    booking: { ...booking, ...partial },
    past,
  };
}

function render(value: ScheduleRow) {
  const fixture = TestBed.createComponent(BookingSheet);
  fixture.componentRef.setInput('row', value);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const buttons = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>);
  const byText = (text: string) => buttons().find((b) => b.textContent?.trim() === text);
  return { fixture, byText };
}

describe('BookingSheet', () => {
  it('lets the master confirm a booking the client created (ТЗ 8.2)', () => {
    const { fixture, byText } = render(row());
    const confirmed = jest.fn();
    fixture.componentInstance.confirm.subscribe(confirmed);
    byText('Подтвердить')!.click();
    expect(confirmed).toHaveBeenCalledWith('b1');
  });

  it('hides «Подтвердить» for bookings the master created', () => {
    const { byText, fixture } = render(row({ createdBy: 'master' }));
    expect(byText('Подтвердить')).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Клиент подтвердит запись в чате');
  });

  it('requires a reason to cancel and passes the mutual flag (ТЗ 6.5)', () => {
    const { fixture, byText } = render(row({ status: 'confirmed' }));
    const cancelled = jest.fn();
    fixture.componentInstance.cancelBooking.subscribe(cancelled);
    byText('Отменить')!.click();
    fixture.detectChanges();

    byText('Отменить запись')!.click();
    fixture.detectChanges();
    expect(cancelled).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Укажите причину отмены');

    const reason: HTMLTextAreaElement = fixture.nativeElement.querySelector('[name=reason]');
    reason.value = 'Заболела';
    reason.dispatchEvent(new Event('input'));
    const mutual: HTMLInputElement = fixture.nativeElement.querySelector('[name=mutual]');
    mutual.click();
    fixture.detectChanges();
    byText('Отменить запись')!.click();
    expect(cancelled).toHaveBeenCalledWith({ bookingId: 'b1', reason: 'Заболела', mutual: true });
  });

  it('offers «Не пришла» only for past bookings', () => {
    expect(render(row({ status: 'confirmed' })).byText('Не пришла')).toBeUndefined();
    TestBed.resetTestingModule();
    expect(render(row({ status: 'confirmed' }, true)).byText('Не пришла')).toBeDefined();
  });
});
