import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { type BecomeMasterInput } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { CABINET_PAGES } from '../../state/cabinet-pages';
import { CabinetStore } from '../../state/cabinet.store';
import { BecomeMaster } from '../../ui/become-master/become-master';
import { injectCabinetFeedback } from '../sections/cabinet-feedback';

/**
 * /profile/master — «Кабинет мастера» (ТЗ 4, 6, 7). Owns the CabinetStore shared by the
 * hub and every cabinet page; side menu from lg. Users without a master profile get the
 * onboarding (ТЗ 2.2).
 */
@Component({
  selector: 'app-cabinet-shell',
  imports: [BecomeMaster, Icon, RouterLink, RouterLinkActive, RouterOutlet],
  providers: [CabinetStore],
  templateUrl: './cabinet-shell.html',
  styleUrl: './cabinet-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetShell {
  protected readonly session = inject(SessionStore);
  protected readonly store = inject(CabinetStore);
  private readonly feedback = injectCabinetFeedback();
  protected readonly pages = CABINET_PAGES;

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
