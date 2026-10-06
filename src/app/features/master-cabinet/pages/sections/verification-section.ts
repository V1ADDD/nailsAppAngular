import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CabinetStore } from '../../state/cabinet.store';
import { VerificationPanel } from '../../ui/verification-panel/verification-panel';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 7. «Верификация» (ТЗ 4.4). */
@Component({
  selector: 'app-verification-section',
  imports: [VerificationPanel],
  template: `
    @if (store.master(); as master) {
      <app-verification-panel
        [status]="master.verification"
        [busy]="store.saving()"
        (request)="request()"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationSection {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();

  protected request(): void {
    this.store.requestVerification(this.feedback.master('Заявка отправлена администратору'));
  }
}
