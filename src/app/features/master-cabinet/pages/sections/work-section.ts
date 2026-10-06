import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { type ScheduleTemplate } from '@app/core/data/models';
import { CabinetStore } from '../../state/cabinet.store';
import { WorkSettingsForm } from '../../ui/work-settings-form/work-settings-form';
import { injectCabinetFeedback } from './cabinet-feedback';

export const SLOT_DAYS = 14;

/** «Рабочий график» (ТЗ 6.1): days, hours, breaks, procedure length, clients at once. */
@Component({
  selector: 'app-work-section',
  imports: [WorkSettingsForm],
  template: `
    @if (store.master(); as master) {
      <app-work-settings-form
        [template]="master.schedule"
        [saving]="store.saving()"
        [days]="days"
        (save)="save($event)"
      />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkSection {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();
  protected readonly days = SLOT_DAYS;

  protected save(template: ScheduleTemplate): void {
    this.store.generateSlots(
      template,
      SLOT_DAYS,
      this.feedback.done(`График сохранён, окна на ${SLOT_DAYS} дней обновлены`, () => {
        const master = this.store.master();
        if (master) this.feedback.syncMaster(master);
      }),
    );
  }
}
