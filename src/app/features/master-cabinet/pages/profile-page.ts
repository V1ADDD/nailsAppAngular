import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { type TabOption, Tabs } from '@app/shared/ui/tabs/tabs';
import { type ProfileTab } from '../state/cabinet-pages';
import { CabinetStore } from '../state/cabinet.store';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { CardSection } from './sections/card-section';
import { PortfolioSection } from './sections/portfolio-section';
import { ServicesSection } from './sections/services-section';
import { VerificationSection } from './sections/verification-section';

const TABS: readonly ProfileTab[] = ['about', 'services', 'portfolio'];
const isTab = (value: string | undefined): value is ProfileTab =>
  TABS.includes(value as ProfileTab);

/**
 * «Профиль»: everything clients see about the master, in three tabs instead of one long
 * list — анкета (name, photo, about, experience, courses, contacts, then verification),
 * услуги, портфолио. `?tab=` keeps the open one.
 */
@Component({
  selector: 'app-profile-page',
  imports: [
    CabinetSection,
    Tabs,
    CardSection,
    ServicesSection,
    PortfolioSection,
    VerificationSection,
  ],
  template: `
    <app-cabinet-section sectionId="profile" title="Профиль">
      <div class="page">
        <app-tabs
          label="Разделы профиля"
          [stretch]="true"
          [tabs]="tabs()"
          [value]="active()"
          (valueChange)="select($event)"
        />
        @switch (active()) {
          @case ('about') {
            <app-card-section />
            <section class="page__verification" aria-labelledby="profile-verification">
              <h3 class="page__subtitle" id="profile-verification">Верификация</h3>
              <app-verification-section />
            </section>
          }
          @case ('services') {
            <app-services-section />
          }
          @case ('portfolio') {
            <app-portfolio-section />
          }
        }
      </div>
    </app-cabinet-section>
  `,
  styles: `
    .page__verification {
      display: grid;
      gap: var(--space-3);
      padding-top: var(--space-5);
      border-top: 1px solid var(--color-border);
    }
    .page__subtitle {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
    }
    .page {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  readonly tab = input<string>();

  private readonly store = inject(CabinetStore);
  private readonly router = inject(Router);

  protected readonly active = computed<ProfileTab>(() => {
    const tab = this.tab();
    return isTab(tab) ? tab : 'about';
  });

  protected readonly tabs = computed<TabOption<ProfileTab>[]>(() => {
    const master = this.store.master();
    return [
      { value: 'about', label: 'Анкета' },
      { value: 'services', label: 'Услуги', count: master?.services.length },
      { value: 'portfolio', label: 'Фото', count: master?.portfolio.length },
    ];
  });

  protected select(tab: ProfileTab): void {
    void this.router.navigate([], { queryParams: { tab }, replaceUrl: true });
  }
}
