import { TestBed } from '@angular/core/testing';
import { SwitchRow } from './switch-row';

describe('SwitchRow', () => {
  it('exposes role="switch" with aria-checked and emits the next value', () => {
    const fixture = TestBed.createComponent(SwitchRow);
    fixture.componentRef.setInput('label', 'Push-уведомления');
    fixture.componentRef.setInput('checked', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.getAttribute('role')).toBe('switch');
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(button.textContent).toContain('Push-уведомления');

    const toggled = jest.fn();
    fixture.componentInstance.toggled.subscribe(toggled);
    button.click();
    expect(toggled).toHaveBeenCalledWith(false);
  });
});
