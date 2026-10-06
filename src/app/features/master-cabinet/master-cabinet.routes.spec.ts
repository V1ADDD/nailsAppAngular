import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Route, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import routes from './master-cabinet.routes';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class Stub {}

/** The real route table with every lazy component replaced by an empty stub. */
function stubbed(list: readonly Route[]): Route[] {
  return list.map(({ loadComponent: _lazy, ...route }) => ({
    ...route,
    ...(route.redirectTo === undefined ? { component: Stub } : {}),
    ...(route.children ? { children: stubbed(route.children) } : {}),
  }));
}

describe('master cabinet routes', () => {
  async function navigate(url: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'profile/master', children: stubbed(routes) }])],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it.each([
    ['/profile/master/card', '/profile/master/profile'],
    ['/profile/master/services', '/profile/master/profile?tab=services'],
    ['/profile/master/portfolio', '/profile/master/profile?tab=portfolio'],
    ['/profile/master/verification', '/profile/master/profile'],
    ['/profile/master/clients', '/profile/master/bookings?tab=clients'],
    ['/profile/master/stats', '/profile/master/income'],
    ['/profile/master/unknown-page', '/profile/master'],
  ])('redirects %s to %s', async (from, to) => {
    expect(await navigate(from)).toBe(to);
  });

  it.each([
    '/profile/master/profile',
    '/profile/master/bookings',
    '/profile/master/schedule',
    '/profile/master/income',
    '/profile/master/settings',
  ])('keeps %s as is', async (path) => {
    expect(await navigate(path)).toBe(path);
  });
});
