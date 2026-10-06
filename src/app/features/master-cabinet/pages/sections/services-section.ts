import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { type ServiceProposal } from '@app/core/data/api';
import { subcategoryName } from '@app/core/data/catalog';
import { type MasterService } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';
import { CabinetStore } from '../../state/cabinet.store';
import { ProposeSheet } from '../../ui/propose-sheet/propose-sheet';
import { ServiceList } from '../../ui/service-list/service-list';
import { type ServiceDraft, ServiceSheet } from '../../ui/service-sheet/service-sheet';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 4. «Услуги и цены» (ТЗ 4.2). */
@Component({
  selector: 'app-services-section',
  imports: [ServiceList, ServiceSheet, ProposeSheet, Icon],
  template: `
    @if (store.master(); as master) {
      <div class="services">
        @if (master.services.length) {
          <app-service-list
            [services]="master.services"
            [busy]="store.saving()"
            (edit)="edit($event)"
            (remove)="remove($event)"
          />
        } @else {
          <div class="empty-state">
            <p class="empty-state__title">Добавьте первую услугу</p>
            <p>Без прайса клиенты не смогут записаться.</p>
          </div>
        }
        <button type="button" class="btn btn--gradient btn--block" (click)="add()">
          <app-icon name="plus" [size]="18" /> Добавить услугу
        </button>
        <button type="button" class="btn btn--ghost btn--sm" (click)="proposeOpen.set(true)">
          Нет нужной услуги? Предложить
        </button>
      </div>

      <app-service-sheet
        [(open)]="sheetOpen"
        [service]="editing()"
        [existing]="master.services"
        [allMasters]="store.allMasters()"
        [saving]="store.saving()"
        (save)="save($event)"
      />
      <app-propose-sheet
        [(open)]="proposeOpen"
        [saving]="store.saving()"
        (propose)="propose($event)"
      />
    }
  `,
  styles: `
    .services {
      display: grid;
      gap: var(--space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesSection {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();

  protected readonly editing = signal<MasterService | null>(null);
  protected readonly sheetOpen = signal(false);
  protected readonly proposeOpen = signal(false);

  protected add(): void {
    this.editing.set(null);
    this.sheetOpen.set(true);
  }

  protected edit(service: MasterService): void {
    this.editing.set(service);
    this.sheetOpen.set(true);
  }

  protected save(draft: ServiceDraft): void {
    this.store.saveService(
      draft,
      this.feedback.master(draft.id ? 'Услуга обновлена' : 'Услуга добавлена', () =>
        this.sheetOpen.set(false),
      ),
    );
  }

  protected remove(service: MasterService): void {
    this.store.removeService(
      service.id,
      this.feedback.master(`Удалено: ${subcategoryName(service.subcategoryId)}`),
    );
  }

  protected propose(proposal: ServiceProposal): void {
    this.store.proposeService(
      proposal,
      this.feedback.done('Отправлено на модерацию', () => this.proposeOpen.set(false)),
    );
  }
}
