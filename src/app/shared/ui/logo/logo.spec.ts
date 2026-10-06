import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Logo } from './logo';

describe('Logo', () => {
  let fixture: ComponentFixture<Logo>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(Logo);
    el = fixture.nativeElement;
  });

  it('exposes the brand name as accessible name and hides the svg', async () => {
    await fixture.whenStable();
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Мастера рядом');
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the wordmark in the full variant only', async () => {
    await fixture.whenStable();
    expect(el.querySelector('.logo__word')?.textContent).toContain('Мастера рядом');

    fixture.componentRef.setInput('variant', 'mark');
    await fixture.whenStable();
    expect(el.querySelector('.logo__word')).toBeNull();
  });

  it('applies the size to the mark', async () => {
    fixture.componentRef.setInput('size', 40);
    await fixture.whenStable();
    expect(el.querySelector('svg')?.getAttribute('width')).toBe('40');
  });
});
