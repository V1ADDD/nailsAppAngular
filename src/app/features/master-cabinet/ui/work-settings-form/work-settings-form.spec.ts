import { TestBed } from '@angular/core/testing';
import { type ScheduleTemplate } from '@app/core/data/models';
import { NBSP } from '@app/shared/format/text';
import { WorkSettingsForm } from './work-settings-form';

const TEMPLATE: ScheduleTemplate = {
  workDays: [1, 2, 3, 4, 5],
  from: '10:00',
  to: '19:00',
  slotMinutes: 60,
  breaks: [],
  capacity: 1,
};

describe('WorkSettingsForm', () => {
  async function setup(template: ScheduleTemplate = TEMPLATE) {
    const fixture = TestBed.createComponent(WorkSettingsForm);
    fixture.componentRef.setInput('template', template);
    const saved: ScheduleTemplate[] = [];
    fixture.componentInstance.save.subscribe((t) => saved.push(t));
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const day = (name: string) => el.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
    const button = (name: string) => el.querySelector<HTMLButtonElement>(`[aria-label="${name}"]`)!;
    const submit = () => el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const click = async (target: HTMLElement) => {
      target.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const sendSubmit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    return { fixture, el, saved, day, button, submit, click, sendSubmit };
  }

  it('renders seven days with the template days pressed', async () => {
    const { el, day } = await setup();
    expect(el.querySelectorAll('.day')).toHaveLength(7);
    expect(day('Понедельник').getAttribute('aria-pressed')).toBe('true');
    expect(day('Суббота').getAttribute('aria-pressed')).toBe('false');
    expect(day('Воскресенье').getAttribute('aria-pressed')).toBe('false');
  });

  it('emits the template with a toggled day on submit', async () => {
    const { day, click, sendSubmit, saved } = await setup();
    await click(day('Суббота'));
    await click(day('Понедельник'));
    await sendSubmit();
    expect(saved).toEqual([{ ...TEMPLATE, workDays: [2, 3, 4, 5, 6] }]);
  });

  it('includes an added break in the emitted template', async () => {
    const { el, click, sendSubmit, saved } = await setup();
    const add = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Добавить перерыв'),
    )!;
    await click(add);
    expect(el.querySelectorAll('input[type="time"]').length).toBe(4);
    await sendSubmit();
    expect(saved[0]!.breaks).toEqual([{ from: '13:00', to: '14:00' }]);
  });

  it('removes a break', async () => {
    const { el, button, click, sendSubmit, saved } = await setup({
      ...TEMPLATE,
      breaks: [{ from: '13:00', to: '14:00' }],
    });
    await click(button('Удалить перерыв 13:00–14:00'));
    expect(el.textContent).toContain('Без перерывов');
    await sendSubmit();
    expect(saved[0]!.breaks).toEqual([]);
  });

  it('keeps the capacity stepper within 1..5', async () => {
    const { el, button, click, sendSubmit, saved } = await setup();
    const value = () => el.querySelector('.stepper__value')!.textContent!.trim();

    expect(button('Меньше').disabled).toBe(true);
    await click(button('Меньше'));
    expect(value()).toBe('1');

    for (let i = 0; i < 6; i++) await click(button('Больше'));
    expect(value()).toBe('5');
    expect(button('Больше').disabled).toBe(true);

    await sendSubmit();
    expect(saved[0]!.capacity).toBe(5);
  });

  it('disables submit and shows the error when all days are off', async () => {
    const { el, day, click, submit, sendSubmit, saved } = await setup({
      ...TEMPLATE,
      workDays: [1],
    });
    expect(submit().disabled).toBe(false);

    await click(day('Понедельник'));

    expect(submit().disabled).toBe(true);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Выберите хотя бы один рабочий день',
    );
    await sendSubmit();
    expect(saved).toEqual([]);
  });

  it('disables submit while saving', async () => {
    const { fixture, submit } = await setup();
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    expect(submit().disabled).toBe(true);
  });

  it('shows the day preview with the slot summary', async () => {
    const { el } = await setup();
    expect(el.querySelector('.preview__title')?.textContent).toContain(`9${NBSP}окон в день`);
    expect(el.querySelectorAll('.preview__times li').length).toBeGreaterThan(0);
  });
});
