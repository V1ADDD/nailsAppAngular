import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { StatsSection } from './sections/stats-section';

/** «Доходы»: earned vs expected, visits, and the forecast per service (ТЗ 7.3). */
@Component({
  selector: 'app-income-page',
  imports: [CabinetSection, StatsSection],
  template: `
    <app-cabinet-section sectionId="income" title="Доходы">
      <app-stats-section />
    </app-cabinet-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomePage {}
