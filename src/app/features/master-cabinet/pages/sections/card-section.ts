import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CabinetStore, type ProfilePatch } from '../../state/cabinet.store';
import { CabinetSection } from '../../ui/cabinet-section/cabinet-section';
import { CompletenessMeter } from '../../ui/completeness-meter/completeness-meter';
import { MasterPreview } from '../../ui/master-preview/master-preview';
import { ProfileForm } from '../../ui/profile-form/profile-form';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 1. «Моя карточка» (ТЗ 4.1). */
@Component({
  selector: 'app-card-section',
  imports: [CabinetSection, MasterPreview, CompletenessMeter, ProfileForm, RouterLink],
  template: `
    <app-cabinet-section sectionId="card" title="Моя карточка" icon="id-card" [badge]="badge()">
      @if (store.master(); as master) {
        <div class="card-body">
          <div class="card-body__preview">
            <app-master-preview [master]="master" />
            <a class="btn btn--outline btn--sm" [routerLink]="['/masters', master.id]">
              Посмотреть как клиент
            </a>
          </div>
          @if (store.completeness(); as completeness) {
            <app-completeness-meter [value]="completeness" />
          }
          <app-profile-form [master]="master" [saving]="store.saving()" (save)="save($event)" />
        </div>
      }
    </app-cabinet-section>
  `,
  styles: `
    .card-body {
      display: grid;
      gap: var(--space-4);
    }
    .card-body__preview {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardSection {
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();

  protected badge(): string | null {
    const percent = this.store.completeness()?.percent ?? 100;
    return percent < 100 ? `${percent}%` : null;
  }

  protected save(patch: ProfilePatch): void {
    this.store.updateProfile(patch, this.feedback.master('Профиль сохранён'));
  }
}
