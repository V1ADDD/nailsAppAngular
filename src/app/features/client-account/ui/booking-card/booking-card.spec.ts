import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { BookingCard } from './booking-card';

const base: BookingView = {
  id: 'b1',
  masterId: 'm1',
  clientId: 'c1',
  subcategoryId: 'manicure-gel',
  price: { kind: 'exact', amount: 45 },
  start: '2030-08-28T07:00:00Z',
  durationMin: 90,
  address: 'ул. Ленина, 42',
  status: 'confirmed',
  source: 'site',
  createdBy: 'client',
  createdAt: '2030-08-20T07:00:00Z',
  slotId: 's1',
  chatId: 'chat-1',
  masterName: 'Анна Серова',
  masterPhotoUrl: null,
  clientName: 'Анна Новикова',
  clientPhotoUrl: null,
  serviceName: 'Маникюр',
  releaseAt: null,
};

function render(booking: Partial<BookingView>, past = false) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(BookingCard);
  fixture.componentRef.setInput('booking', { ...base, ...booking });
  fixture.componentRef.setInput('past', past);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (text: string) =>
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(text));
  return { fixture, el, button };
}

describe('BookingCard', () => {
  it('shows master, service, date, price and the confirmed status', () => {
    const { el } = render({});
    expect(el.textContent).toContain('Анна Серова');
    expect(el.textContent).toContain('Маникюр');
    expect(el.textContent).toContain('28 авг');
    expect(el.textContent).toContain('10:00');
    expect(el.textContent).toContain('45');
    expect(el.querySelector('.tag--success')?.textContent).toContain('Подтверждено');
  });

  it('asks the client to confirm a pending booking the master created, with a deadline', () => {
    const { el, button, fixture } = render({
      status: 'pending',
      createdBy: 'master',
      releaseAt: '2030-08-27T07:00:00Z',
    });
    expect(el.querySelector('.tag--warning')?.textContent).toContain('Ждёт вашего подтверждения');
    expect(el.textContent).toContain('Подтвердите до 27 авг, 10:00');
    const confirmed = jest.fn();
    fixture.componentInstance.confirm.subscribe(confirmed);
    button('Подтвердить')!.click();
    expect(confirmed).toHaveBeenCalled();
  });

  it('emits reschedule, cancel and chat actions for upcoming bookings', () => {
    const { button, fixture } = render({});
    const events: string[] = [];
    fixture.componentInstance.reschedule.subscribe(() => events.push('reschedule'));
    fixture.componentInstance.cancelBooking.subscribe(() => events.push('cancel'));
    fixture.componentInstance.chat.subscribe(() => events.push('chat'));
    button('Перенести')!.click();
    button('Отменить')!.click();
    button('Написать')!.click();
    expect(events).toEqual(['reschedule', 'cancel', 'chat']);
    expect(button('Подтвердить')).toBeUndefined();
  });

  it('shows the cancellation reason on past cancelled bookings and hides cancel/reschedule', () => {
    const { el, button } = render(
      {
        status: 'cancelled',
        cancellation: { by: 'master', reason: 'Заболела', mutual: false, at: '' },
      },
      true,
    );
    expect(el.querySelector('.tag--danger')?.textContent).toContain('Отменено');
    expect(el.textContent).toContain('Мастер отменил. Причина: Заболела');
    expect(button('Перенести')).toBeUndefined();
    expect(button('Отменить')).toBeUndefined();
    expect(el.textContent).toContain('Записаться снова');
  });
});
