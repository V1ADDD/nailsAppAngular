import { TestBed } from '@angular/core/testing';
import { CancelBookingSheet, type CancelDecision, RESCHEDULE_REASON } from './cancel-booking-sheet';

function render(mode: 'cancel' | 'reschedule') {
  const fixture = TestBed.createComponent(CancelBookingSheet);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('open', true);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const submitted: CancelDecision[] = [];
  fixture.componentInstance.submitted.subscribe((d) => submitted.push(d));
  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const submit = () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
  };
  const pick = (label: string) => {
    const option = Array.from(el.querySelectorAll('label.option')).find((l) =>
      l.textContent?.includes(label),
    );
    const radio = option!.querySelector('input')!;
    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  return { fixture, el, submitted, submit, submitButton, pick };
}

describe('CancelBookingSheet', () => {
  it('requires a reason and warns that a one-sided cancellation lowers the rating', () => {
    const { el, submitted, submit, submitButton, pick } = render('cancel');
    expect(submitButton().disabled).toBe(true);
    expect(el.textContent).toContain('Односторонняя отмена снижает рейтинг');

    submit();
    expect(submitted).toEqual([]);

    pick('Изменились планы');
    expect(submitButton().disabled).toBe(false);
    submit();
    expect(submitted).toEqual([{ reason: 'Изменились планы', mutual: false }]);
  });

  it('needs text when «Другое» is chosen', () => {
    const { el, fixture, submitted, submit, submitButton, pick } = render('cancel');
    pick('Другое');
    expect(submitButton().disabled).toBe(true);
    const textarea = el.querySelector('textarea')!;
    textarea.value = 'Уезжаю в командировку';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    submit();
    expect(submitted).toEqual([{ reason: 'Уезжаю в командировку', mutual: false }]);
  });

  it('reschedule explains the flow, preselects the reason and is mutual by default', () => {
    const { el, submitted, submit } = render('reschedule');
    expect(el.textContent).toContain('Перенос — это отмена текущей записи');
    expect(el.textContent).not.toContain('Односторонняя отмена снижает рейтинг');
    submit();
    expect(submitted).toEqual([{ reason: RESCHEDULE_REASON, mutual: true }]);
  });
});
