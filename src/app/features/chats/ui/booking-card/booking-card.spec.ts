import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type BookingView } from '@app/core/data/api';
import { type Role } from '@app/core/data/models';
import { BookingCard } from './booking-card';

const now = new Date('2026-08-20T12:00:00+03:00');

function booking(patch: Partial<BookingView> = {}): BookingView {
  return {
    id: 'b1',
    masterId: 'm-anna',
    clientId: 'c1',
    subcategoryId: 'manicure-combined',
    price: { kind: 'exact', amount: 45 },
    start: '2026-08-28T10:00:00+03:00',
    durationMin: 60,
    address: 'ул. Немига, 5',
    status: 'pending',
    source: 'site',
    createdBy: 'master',
    createdAt: '2026-08-20T11:00:00+03:00',
    slotId: null,
    chatId: 'chat-1',
    masterName: 'Анна',
    masterPhotoUrl: null,
    clientName: 'Ольга',
    clientPhotoUrl: null,
    serviceName: 'Маникюр',
    releaseAt: '2026-08-27T10:00:00+03:00',
    ...patch,
  };
}

async function render(b: BookingView, role: Role) {
  TestBed.configureTestingModule({ imports: [BookingCard], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(BookingCard);
  fixture.componentRef.setInput('booking', b);
  fixture.componentRef.setInput('role', role);
  fixture.componentRef.setInput('now', now);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => [...el.querySelectorAll('button')].map((x) => x.textContent!.trim());
  return { fixture, el, buttons };
}

describe('BookingCard', () => {
  it('lets the opposite side confirm or cancel a pending booking (ТЗ 8.2)', async () => {
    const { el, buttons } = await render(booking({ createdBy: 'master' }), 'client');

    expect(el.textContent).toContain('Маникюр');
    expect(el.textContent).toContain('28 авг 2026');
    expect(el.textContent).toContain('45');
    expect(el.textContent).toContain('Ожидает подтверждения');
    expect(buttons()).toEqual(['Подтвердить', 'Отменить']);
  });

  it('shows the creator only «Отменить» and the release time (ТЗ 6.4)', async () => {
    const { el, buttons } = await render(booking({ createdBy: 'client' }), 'client');

    expect(buttons()).toEqual(['Отменить']);
    expect(el.textContent).toContain('освободится, если не подтвердить до 27 авг, 10:00');
  });

  it('emits the booking id on confirm', async () => {
    const { fixture, el } = await render(booking(), 'client');
    const spy = jest.fn();
    fixture.componentInstance.confirmed.subscribe(spy);
    el.querySelector<HTMLButtonElement>('.btn--success')!.click();
    expect(spy).toHaveBeenCalledWith('b1');
  });

  it('shows the reason of a cancelled booking without actions', async () => {
    const { el, buttons } = await render(
      booking({
        status: 'cancelled',
        cancellation: { by: 'client', reason: 'Заболела', mutual: true, at: '' },
      }),
      'master',
    );
    expect(el.textContent).toContain('Отменено: Заболела');
    expect(buttons()).toEqual([]);
  });

  it('offers to restore a booking that expired unconfirmed', async () => {
    const { el } = await render(
      booking({
        status: 'cancelled',
        cancellation: {
          by: 'master',
          reason: 'Запись не подтверждена вовремя — окно освободилось',
          mutual: true,
          at: '',
          expired: true,
        },
      }),
      'client',
    );
    const link = el.querySelector('a')!;
    expect(el.textContent).toContain('Бронь можно восстановить');
    expect(link.getAttribute('href')).toBe('/masters/m-anna?book=1&service=manicure-combined');
  });

  it('shows «Завершено» for completed bookings', async () => {
    const { el, buttons } = await render(booking({ status: 'completed' }), 'client');
    expect(el.textContent).toContain('Завершено');
    expect(buttons()).toEqual([]);
  });
});
