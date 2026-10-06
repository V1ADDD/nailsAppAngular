import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupportService } from '@app/core/support/support.service';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { CabinetStore } from '../../state/cabinet.store';
import { durationLabel } from '../../state/schedule-logic';
import { CabinetSection } from '../../ui/cabinet-section/cabinet-section';
import { injectCabinetFeedback } from '../sections/cabinet-feedback';

const AUTO_CONFIRM_MINUTES = [15, 30, 60, 120] as const;
const DELETE_WORD = 'УДАЛИТЬ';

/**
 * «Настройки» of the master cabinet: auto-confirmation of bookings, help (support, rules),
 * and deleting the master profile (the client account stays).
 */
@Component({
  selector: 'app-cabinet-settings-page',
  imports: [CabinetSection, FormsModule, Icon, Sheet],
  templateUrl: './cabinet-settings-page.html',
  styleUrl: './cabinet-settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetSettingsPage {
  protected readonly store = inject(CabinetStore);
  private readonly session = inject(SessionStore);
  private readonly support = inject(SupportService);
  private readonly router = inject(Router);
  private readonly feedback = injectCabinetFeedback();

  protected readonly minutes = AUTO_CONFIRM_MINUTES;
  protected readonly durationLabel = durationLabel;
  protected readonly deleteWord = DELETE_WORD;

  protected readonly autoConfirm = computed(
    () => this.store.master()?.autoConfirm ?? { enabled: false, afterMinutes: 30 },
  );

  protected readonly rulesOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly confirmText = signal('');
  protected readonly canDelete = computed(
    () => this.confirmText().trim().toUpperCase() === DELETE_WORD,
  );

  protected setAutoConfirm(patch: Partial<{ enabled: boolean; afterMinutes: number }>): void {
    this.store.updateProfile(
      { autoConfirm: { ...this.autoConfirm(), ...patch } },
      this.feedback.master('Настройка сохранена'),
    );
  }

  protected openSupport(): void {
    this.support.open();
  }

  protected openDelete(): void {
    this.confirmText.set('');
    this.deleteOpen.set(true);
  }

  protected deleteProfile(): void {
    if (!this.canDelete()) return;
    this.store.deleteMasterProfile(
      this.feedback.done('Профиль мастера удалён', (snapshot) => {
        this.deleteOpen.set(false);
        this.session.setSnapshot(snapshot);
        void this.router.navigate(['/profile/client']);
      }),
    );
  }
}
