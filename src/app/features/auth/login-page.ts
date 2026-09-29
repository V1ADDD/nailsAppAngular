import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';

/** Mock sign-in: there is no backend, so «Войти» signs in the demo account. */
@Component({
  selector: 'app-login-page',
  imports: [Icon],
  template: `
    <section class="login">
      <div class="login__card card">
        <span class="login__mark" aria-hidden="true"><app-icon name="sparkles" [size]="28" /></span>
        <h1 class="display-title">Вход</h1>
        <p class="login__lead">
          Записывайтесь к мастерам, переписывайтесь и храните избранное. Если вы мастер — ведите
          график и клиентов в том же аккаунте.
        </p>
        <label class="field">
          <span class="field__label">Телефон</span>
          <input class="input" type="tel" value="+375 (29) 123-45-67" autocomplete="tel" readonly />
          <span class="field__hint">Демо-версия: вход в тестовый аккаунт без кода из SMS</span>
        </label>
        <button type="button" class="btn btn--primary btn--lg btn--block" (click)="login()">
          Войти
        </button>
      </div>
    </section>
  `,
  styles: `
    .login {
      display: grid;
      place-items: center;
      min-height: 100%;
      padding: var(--space-6) var(--space-4);
    }
    .login__card {
      display: grid;
      gap: var(--space-4);
      width: min(26rem, 100%);
      padding: var(--space-8) var(--space-6);
    }
    .login__mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      color: var(--color-primary-contrast);
      background: var(--gradient-primary);
      border-radius: var(--radius-lg);
    }
    .login__lead {
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  /** Where to go after signing in (query param set by the auth guard). */
  readonly redirect = input<string>('/profile');

  protected login(): void {
    this.session.login();
    void this.router.navigateByUrl(this.redirect() || '/profile');
  }
}
