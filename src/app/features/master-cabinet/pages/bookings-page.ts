import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { type TabOption, Tabs } from '@app/shared/ui/tabs/tabs';
import { type BookingsTab } from '../state/cabinet-pages';
import { CabinetStore } from '../state/cabinet.store';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { ClientsSection } from './sections/clients-section';
import { ScheduleSection } from './sections/schedule-section';

/** «Записи»: the bookings (list or calendar) and the client base. `?tab=clients`. */
@Component({
  selector: 'app-bookings-page',
  imports: [CabinetSection, Tabs, ScheduleSection, ClientsSection],
  template: `
    <app-cabinet-section sectionId="bookings" title="Записи">
      <div class="page">
        <app-tabs
          variant="underline"
          label="Записи или клиенты"
          [tabs]="tabs()"
          [value]="active()"
          (valueChange)="select($event)"
        />
        @if (active() === 'clients') {
          <app-clients-section />
        } @else {
          <app-schedule-section />
        }
      </div>
    </app-cabinet-section>
  `,
  styles: `
    .page {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsPage {
  readonly tab = input<string>();

  private readonly store = inject(CabinetStore);
  private readonly router = inject(Router);

  protected readonly active = computed<BookingsTab>(() =>
    this.tab() === 'clients' ? 'clients' : 'schedule',
  );
  protected readonly tabs = computed<TabOption<BookingsTab>[]>(() => [
    { value: 'schedule', label: 'Записи', count: this.store.pendingCount() },
    { value: 'clients', label: 'Клиенты', count: this.store.clients().length },
  ]);

  protected select(tab: BookingsTab): void {
    void this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
  }
}
