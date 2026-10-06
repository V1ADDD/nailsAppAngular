import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Tabs } from '@app/shared/ui/tabs/tabs';
import { CabinetStore } from '../state/cabinet.store';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { BookingsPage } from './bookings-page';

@Component({
  selector: 'app-clients-section',
  template: 'STUB-CLIENTS',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubClients {}
@Component({
  selector: 'app-schedule-section',
  template: 'STUB-SCHEDULE',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class StubSchedule {}

describe('BookingsPage', () => {
  let fixture: ComponentFixture<BookingsPage>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const tabButton = (name: RegExp) =>
    Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role=tab]'),
    ).find((b) => name.test(b.textContent ?? ''))!;

  async function setup(tab?: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CabinetStore,
          useValue: { pendingCount: signal(2), clients: signal([{}, {}, {}]) },
        },
      ],
    });
    TestBed.overrideComponent(BookingsPage, {
      set: { imports: [CabinetSection, Tabs, StubClients, StubSchedule] },
    });
    fixture = TestBed.createComponent(BookingsPage);
    if (tab !== undefined) fixture.componentRef.setInput('tab', tab);
    await fixture.whenStable();
  }

  it('shows the schedule section by default', async () => {
    await setup();
    expect(text()).toContain('STUB-SCHEDULE');
    expect(text()).not.toContain('STUB-CLIENTS');
  });

  it('shows clients for tab=clients', async () => {
    await setup('clients');
    expect(text()).toContain('STUB-CLIENTS');
    expect(text()).not.toContain('STUB-SCHEDULE');
  });

  it('shows pending and clients counters in the tabs', async () => {
    await setup();
    expect(tabButton(/Записи/).textContent).toContain('2');
    expect(tabButton(/Клиенты/).textContent).toContain('3');
  });

  it('navigates with ?tab= when «Клиенты» is selected', async () => {
    await setup();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    tabButton(/Клиенты/).click();
    expect(navigate).toHaveBeenCalledWith([], {
      queryParams: { tab: 'clients' },
      replaceUrl: true,
    });
  });
});
