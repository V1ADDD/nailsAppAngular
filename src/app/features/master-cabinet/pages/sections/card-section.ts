import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CabinetStore, type ProfilePatch } from '../../state/cabinet.store';
import { CompletenessMeter } from '../../ui/completeness-meter/completeness-meter';
import { MasterPreview } from '../../ui/master-preview/master-preview';
import { ProfileForm } from '../../ui/profile-form/profile-form';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 1. «Моя карточка» (ТЗ 4.1). */
@Component({
  selector: 'app-card-section',
  imports: [MasterPreview, CompletenessMeter, ProfileForm, RouterLink],
  template: `
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

  protected save(patch: ProfilePatch): void {
    this.store.updateProfile(patch, this.feedback.master('Профиль сохранён'));
  }
}
