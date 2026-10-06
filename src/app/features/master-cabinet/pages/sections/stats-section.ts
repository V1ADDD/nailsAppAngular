import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Swipe } from '@app/shared/ui/swipe';
import { Tabs } from '@app/shared/ui/tabs/tabs';
import { CabinetStore } from '../../state/cabinet.store';
import { neighbourPeriod } from '../../state/schedule-logic';
import { RevenueDonut } from '../../ui/revenue-donut/revenue-donut';
import { RevenueForecast } from '../../ui/revenue-forecast/revenue-forecast';
import { StatsTiles } from '../../ui/stats-tiles/stats-tiles';
import { PERIOD_TABS } from './schedule-section';

/** «Статистика» (ТЗ 7.3) + the expected revenue per service. */
@Component({
  selector: 'app-stats-section',
  imports: [Tabs, Swipe, StatsTiles, RevenueDonut, RevenueForecast],
  template: `
    <div
      class="stats"
      appSwipe
      (swipeLeft)="swipe(1)"
      (swipeRight)="swipe(-1)"
      (pointerdown)="$event.stopPropagation()"
      (pointerup)="$event.stopPropagation()"
    >
      <app-tabs
        label="Период статистики"
        [tabs]="tabs"
        [value]="store.statsPeriod()"
        (valueChange)="store.setStatsPeriod($event)"
      />
      @if (store.currentStats(); as stats) {
        <app-revenue-donut [revenue]="stats.revenue" [expected]="stats.expectedRevenue" />
        <app-stats-tiles [stats]="stats" />
        <app-revenue-forecast [lines]="stats.expectedByService" [total]="stats.expectedRevenue" />
      } @else if (store.errors().stats) {
        <div class="empty-state" role="alert">
          <p class="empty-state__title">Не удалось загрузить статистику</p>
          <button type="button" class="btn btn--outline btn--sm" (click)="store.retry('stats')">
            Повторить
          </button>
        </div>
      } @else {
        <div class="stats__loading" aria-busy="true" aria-label="Загружаем статистику">
          <div class="skeleton stats__ring"></div>
          <div class="skeleton stats__tiles"></div>
        </div>
      }
      <p class="stats__soon">Скоро: учёт материалов и сроков годности</p>
    </div>
  `,
  styles: `
    .stats,
    .stats__loading {
      display: grid;
      gap: var(--space-4);
    }
    .stats__ring {
      justify-self: center;
      width: 11rem;
      height: 11rem;
      border-radius: var(--radius-full);
    }
    .stats__tiles {
      height: 9rem;
      border-radius: var(--radius-md);
    }
    .stats__soon {
      font-size: var(--font-size-xs);
      color: var(--color-text-muted);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsSection {
  protected readonly store = inject(CabinetStore);
  protected readonly tabs = PERIOD_TABS;

  protected swipe(step: number): void {
    this.store.setStatsPeriod(neighbourPeriod(this.store.statsPeriod(), step));
  }
}
