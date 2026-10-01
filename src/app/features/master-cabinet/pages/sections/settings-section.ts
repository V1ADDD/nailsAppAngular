import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { type ScheduleTemplate } from '@app/core/data/models';
import { CabinetStore } from '../../state/cabinet.store';
import { CabinetSection } from '../../ui/cabinet-section/cabinet-section';
import { WorkSettingsForm } from '../../ui/work-settings-form/work-settings-form';
import { injectCabinetFeedback } from './cabinet-feedback';

export const SLOT_DAYS = 14;

/** «Рабочий график» (ТЗ 6.1): days, hours, breaks, procedure length, clients at once. */
@Component({
  selector: 'app-settings-section',
  imports: [CabinetSection, WorkSettingsForm],
  template: `
    <app-cabinet-section sectionId="settings" title="Рабочий график" icon="clock">
      @if (store.master(); as master) {
        <app-work-settings-form
          [template]="master.schedule"
          [saving]="store.saving()"
          [days]="days"
          (save)="save($event)"
        />
      }
    </app-cabinet-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSection {
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
