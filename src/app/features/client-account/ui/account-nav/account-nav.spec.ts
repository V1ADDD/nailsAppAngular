import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AccountNav, type AccountNavItem } from './account-nav';

const ITEMS: AccountNavItem[] = [
  { path: '/a/bookings', label: 'Записи', icon: 'calendar' },
  { path: '/a/settings', label: 'Настройки', icon: 'sliders-horizontal' },
];

@Component({
  imports: [AccountNav],
  template: '<app-account-nav [items]="items" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class Host {
  readonly items = ITEMS;
}

describe('AccountNav', () => {
  it('renders a labelled nav of links and marks the current section', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'a/:section', component: Host }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/a/settings');
    const el = harness.routeNativeElement!;

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Разделы кабинета');
    expect(el.querySelector('[role="tablist"]')).toBeNull();
    const links = Array.from(el.querySelectorAll('a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/a/bookings', '/a/settings']);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
  });
});
