import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-master-page',
  template: `<section class="empty-state">
    <h1 class="display-title">Мастер</h1>
    <p>Скоро здесь будет экран.</p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterPage {}
