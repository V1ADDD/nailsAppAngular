import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { type Role } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Segmented, type SegmentedOption } from '@app/shared/ui/segmented/segmented';
import { Swipe } from '@app/shared/ui/swipe';

const ROLE_OPTIONS: readonly SegmentedOption<Role>[] = [
  { value: 'client', label: 'Клиент' },
  { value: 'master', label: 'Мастер' },
];

/**
 * /profile: «Клиент | Мастер» switch (ТЗ 2.2 — button or swipe) above the client account
 * (/profile/client) or the master cabinet (/profile/master).
 */
@Component({
  selector: 'app-profile-shell',
  imports: [RouterOutlet, Segmented, Swipe],
  template: `
    <div
      class="profile"
      appSwipe
      (swipeLeft)="switchTo('master')"
      (swipeRight)="switchTo('client')"
    >
      <div class="profile__switch">
        <app-segmented
          label="Режим профиля"
          [options]="roleOptions"
          [value]="role()"
          (valueChange)="switchTo($event)"
        />
      </div>
      <router-outlet />
    </div>
  `,
  styleUrl: './profile-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileShell {
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);
  protected readonly roleOptions = ROLE_OPTIONS;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly role = computed<Role>(() =>
    this.url().startsWith('/profile/master') ? 'master' : 'client',
  );

  constructor() {
    // Keep the session's active role in sync with the visible cabinet (chats follow it).
    effect(() => this.session.setRole(this.role()));
  }

  protected switchTo(role: Role): void {
    if (role !== this.role()) void this.router.navigate(['/profile', role]);
  }
}
