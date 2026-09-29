import { TestBed } from '@angular/core/testing';
import { type Message } from '@app/core/data/models';
import { Composer } from './composer';

async function render() {
  TestBed.configureTestingModule({ imports: [Composer] });
  const fixture = TestBed.createComponent(Composer);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const textarea = el.querySelector('textarea')!;
  const send = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const type = async (value: string) => {
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const press = (shiftKey = false) =>
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey }));
  return { fixture, el, textarea, send, type, press };
}

describe('Composer', () => {
  it('disables send while empty', async () => {
    const { send, type } = await render();
    expect(send.disabled).toBe(true);
    await type('   ');
    expect(send.disabled).toBe(true);
    await type('Привет');
    expect(send.disabled).toBe(false);
  });

  it('sends trimmed text on Enter and clears the input', async () => {
    const { fixture, textarea, type, press } = await render();
    const spy = jest.fn();
    fixture.componentInstance.sent.subscribe(spy);
    await type('  Привет  ');
    press();
    await fixture.whenStable();

    expect(spy).toHaveBeenCalledWith({ text: 'Привет', imageUrl: undefined });
    expect(textarea.value).toBe('');
  });

  it('does not send on Shift+Enter', async () => {
    const { fixture, type, press } = await render();
    const spy = jest.fn();
    fixture.componentInstance.sent.subscribe(spy);
    await type('Привет');
    press(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('edits an own message in place', async () => {
    const { fixture, textarea, type, press } = await render();
    const message: Message = {
      id: 'm1',
      chatId: 'c',
      kind: 'text',
      author: 'client',
      text: 'Старый',
      sentAt: '',
    };
    fixture.componentRef.setInput('editing', message);
    await fixture.whenStable();
    expect(textarea.value).toBe('Старый');

    const spy = jest.fn();
    fixture.componentInstance.editSaved.subscribe(spy);
    await type('Новый');
    press();
    expect(spy).toHaveBeenCalledWith({ id: 'm1', text: 'Новый' });
  });
});
