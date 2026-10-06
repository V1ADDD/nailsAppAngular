import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type Master } from '@app/core/data/models';
import { Tabs } from '@app/shared/ui/tabs/tabs';
import { CabinetStore } from '../state/cabinet.store';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { ProfilePage } from './profile-page';

@Component({
  selector: 'app-card-section',
  template: 'STUB-ABOUT',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubCard {}
@Component({
  selector: 'app-services-section',
  template: 'STUB-SERVICES',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubServices {}
@Component({
  selector: 'app-portfolio-section',
  template: 'STUB-PORTFOLIO',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubPortfolio {}
@Component({
  selector: 'app-verification-section',
  template: 'STUB-VERIFICATION',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubVerification {}

const master = { services: [{}, {}], portfolio: [{}, {}, {}] } as unknown as Master;

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  async function setup(tab?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CabinetStore, useValue: { master: signal(master) } },
      ],
    });
    TestBed.overrideComponent(ProfilePage, {
      set: {
        imports: [CabinetSection, Tabs, StubCard, StubServices, StubPortfolio, StubVerification],
      },
    });
    fixture = TestBed.createComponent(ProfilePage);
    if (tab !== undefined) fixture.componentRef.setInput('tab', tab);
    await fixture.whenStable();
  }

  const tabButton = (name: RegExp) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role=tab]'),
    ).find((b) => name.test(b.textContent ?? ''))!;

  it('shows the «Анкета» tab by default', async () => {
    await setup();
    expect(text()).toContain('STUB-ABOUT');
    expect(tabButton(/Анкета/).getAttribute('aria-selected')).toBe('true');
  });

  it('falls back to «Анкета» for an unknown tab', async () => {
    await setup('nonsense');
    expect(text()).toContain('STUB-ABOUT');
  });

  it('shows the portfolio section for tab=portfolio', async () => {
    await setup('portfolio');
    expect(text()).toContain('STUB-PORTFOLIO');
    expect(text()).not.toContain('STUB-ABOUT');
  });

  it('shows the services tab', async () => {
    await setup('services');
    expect(text()).toContain('STUB-SERVICES');
    expect(text()).not.toContain('STUB-VERIFICATION');
  });

  it('shows verification under the «Анкета» tab', async () => {
    await setup();
    expect(text()).toContain('STUB-ABOUT');
    expect(text()).toContain('STUB-VERIFICATION');
  });

  it('shows counters in tab labels', async () => {
    await setup();
    expect(tabButton(/Услуги/).textContent).toContain('2');
    expect(tabButton(/Фото/).textContent).toContain('3');
  });

  it('navigates with ?tab= when a tab is selected', async () => {
    await setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    tabButton(/Услуги/).click();
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { tab: 'services' },
      replaceUrl: true,
    });
  });
});
