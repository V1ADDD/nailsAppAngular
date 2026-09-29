import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { type BecomeMasterInput } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { CabinetStore } from '../../state/cabinet.store';
import { BecomeMaster } from '../../ui/become-master/become-master';
import { CardSection } from './sections/card-section';
import { ClientsSection } from './sections/clients-section';
import { PortfolioSection } from './sections/portfolio-section';
import { ScheduleSection } from './sections/schedule-section';
import { ServicesSection } from './sections/services-section';
import { StatsSection } from './sections/stats-section';
import { VerificationSection } from './sections/verification-section';
import { injectCabinetFeedback } from './sections/cabinet-feedback';

/**
 * /profile/master — «Кабинет мастера» (ТЗ 4, 6, 7): accordion stack on mobile, two
 * columns on desktop. Users without a master profile get the onboarding (ТЗ 2.2).
 */
@Component({
  selector: 'app-master-cabinet-page',
  imports: [
    BecomeMaster,
    CardSection,
    ScheduleSection,
    ClientsSection,
    ServicesSection,
    PortfolioSection,
    StatsSection,
    VerificationSection,
  ],
  providers: [CabinetStore],
  templateUrl: './master-cabinet-page.html',
  styleUrl: './master-cabinet-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterCabinetPage {
  protected readonly session = inject(SessionStore);
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();

  protected readonly initial = computed(() => {
    const name = this.session.master()?.name ?? this.session.client()?.name ?? '';
    return name.trim().charAt(0).toUpperCase() || 'М';
  });

  constructor() {
    this.store.connect(this.session.master);
  }

  protected becomeMaster(input: BecomeMasterInput): void {
    this.store.becomeMaster(
      input,
      this.feedback.done('Кабинет мастера создан', (snapshot) =>
        this.session.setSnapshot(snapshot),
      ),
    );
  }
}
