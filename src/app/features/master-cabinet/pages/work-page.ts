import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';
import { CabinetStore } from '../state/cabinet.store';
import { AddSlotSheet } from '../ui/add-slot-sheet/add-slot-sheet';
import { CabinetSection } from '../ui/cabinet-section/cabinet-section';
import { injectCabinetFeedback } from './sections/cabinet-feedback';
import { WorkSection } from './sections/work-section';

/** «График»: the regular working schedule, plus one-off windows outside it. */
@Component({
  selector: 'app-work-page',
  imports: [CabinetSection, Icon, WorkSection, AddSlotSheet],
  template: `
    <app-cabinet-section sectionId="schedule" title="График">
      <button actions type="button" class="btn btn--outline btn--sm" (click)="addOpen.set(true)">
        <app-icon name="plus" [size]="16" /> Разовое окно
      </button>
      <app-work-section />
    </app-cabinet-section>

    <app-add-slot-sheet
      [(open)]="addOpen"
      [defaultDuration]="store.master()?.schedule?.slotMinutes ?? 60"
      [saving]="store.saving()"
      (addSlot)="addSlot($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkPage {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();
  protected readonly addOpen = signal(false);

  protected addSlot(event: { start: string; durationMin: number }): void {
    this.store.addSlot(
      event.start,
      event.durationMin,
      this.feedback.done('Окно добавлено — оно видно в «Записях»', () => this.addOpen.set(false)),
    );
  }
}
