import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CabinetStore } from '../../../state/cabinet.store';
import { CabinetSection } from '../../../ui/cabinet-section/cabinet-section';
import { VerificationPanel } from '../../../ui/verification-panel/verification-panel';
import { injectCabinetFeedback } from './cabinet-feedback';

const BADGES = {
  none: null,
  pending: 'На проверке',
  verified: 'Подтверждена',
  rejected: 'Отклонена',
};

/** 7. «Верификация» (ТЗ 4.4). */
@Component({
  selector: 'app-verification-section',
  imports: [CabinetSection, VerificationPanel],
  template: `
    <app-cabinet-section
      sectionId="verification"
      title="Верификация"
      icon="shield-check"
      [open]="store.openSections().verification"
      [badge]="badge()"
      (toggled)="store.toggleSection('verification')"
    >
      @if (store.master(); as master) {
        <app-verification-panel
          [status]="master.verification"
          [busy]="store.saving()"
          (request)="request()"
        />
      }
    </app-cabinet-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationSection {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();

  protected readonly badge = computed(() => {
    const status = this.store.master()?.verification;
    return status ? BADGES[status] : null;
  });

  protected request(): void {
    this.store.requestVerification(this.feedback.master('Заявка отправлена администратору'));
  }
}
