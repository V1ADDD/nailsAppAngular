import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-client-account-page',
  template: `<section class="empty-state">
    <h1 class="display-title">Профиль клиента</h1>
    <p>Скоро здесь будет экран.</p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAccountPage {}
