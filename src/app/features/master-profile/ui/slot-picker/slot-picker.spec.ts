import { TestBed } from '@angular/core/testing';
import { type Slot } from '@app/core/data/models';
import { SlotPicker } from './slot-picker';

const slot = (id: string, start: string, status: Slot['status']): Slot => ({
  id,
  masterId: 'm1',
  start,
  durationMin: 60,
  status,
  bookingId: null,
});

describe('SlotPicker', () => {
  async function render() {
    const fixture = TestBed.createComponent(SlotPicker);
    fixture.componentRef.setInput('days', [
      { key: '2026-10-01', date: new Date('2026-10-01T06:00:00Z'), free: 1 },
      { key: '2026-10-02', date: new Date('2026-10-02T06:00:00Z'), free: 0 },
    ]);
    fixture.componentRef.setInput('day', '2026-10-01');
    fixture.componentRef.setInput('slots', [
      slot('a', '2026-10-01T07:00:00Z', 'free'),
      slot('b', '2026-10-01T08:00:00Z', 'busy'),
      slot('c', '2026-10-01T09:00:00Z', 'pending'),
    ]);
    fixture.componentRef.setInput('slotId', 'a');
    await fixture.whenStable();
    return fixture;
  }

  it('shows busy and pending slots as disabled with their status (ТЗ 6.2)', async () => {
    const fixture = await render();
    const times = [...fixture.nativeElement.querySelectorAll('.time')] as HTMLButtonElement[];
    expect(times.map((t) => t.disabled)).toEqual([false, true, true]);
    expect(times[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(times[1]!.textContent).toContain('занято');
    expect(times[2]!.textContent).toContain('ожидает подтверждения');
  });

  it('emits the picked slot and day', async () => {
    const fixture = await render();
    const slotSpy = jest.fn();
    const daySpy = jest.fn();
    fixture.componentInstance.slotChange.subscribe(slotSpy);
    fixture.componentInstance.dayChange.subscribe(daySpy);
    (fixture.nativeElement.querySelector('.time') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelectorAll('.day')[1] as HTMLButtonElement).click();
    expect(slotSpy).toHaveBeenCalledWith('a');
    expect(daySpy).toHaveBeenCalledWith('2026-10-02');
  });
});
