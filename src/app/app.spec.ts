import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { MOCK_API_PROVIDERS } from './core/data/mock/mock-apis';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), ...MOCK_API_PROVIDERS],
    }).compileComponents();
  });

  it('renders the shell: top bar, content outlet and tab bar', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-top-bar')).not.toBeNull();
    expect(el.querySelector('main router-outlet')).not.toBeNull();
    const tabs = [...el.querySelectorAll('app-bottom-nav a')].map((a) => a.textContent?.trim());
    expect(tabs).toEqual(['Карта', 'Чаты', 'Профиль']);
  });
});
