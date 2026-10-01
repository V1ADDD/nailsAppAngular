import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { sectionRedirect } from './client-account.routes';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class Stub {}

describe('client account routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'profile/client',
            children: [
              { path: '', pathMatch: 'full', redirectTo: sectionRedirect },
              { path: ':section', component: Stub },
            ],
          },
        ]),
      ],
    });
  });

  async function landOn(url: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  }

  it('opens «Записи» by default', async () => {
    expect(await landOn('/profile/client')).toBe('/profile/client/bookings');
  });

  it('maps an old ?tab= link to its section', async () => {
    expect(await landOn('/profile/client?tab=favorites')).toBe('/profile/client/favorites');
  });

  it('keeps other query params such as ?sub=', async () => {
    expect(await landOn('/profile/client?tab=bookings&sub=past')).toBe(
      '/profile/client/bookings?sub=past',
    );
  });

  it('falls back to bookings for an unknown tab', async () => {
    expect(await landOn('/profile/client?tab=nope')).toBe('/profile/client/bookings');
  });
});
