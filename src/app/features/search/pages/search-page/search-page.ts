import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-search-page',
  template: `<section class="empty-state">
    <h1 class="display-title">Карта мастеров</h1>
    <p>Скоро здесь будет экран.</p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {}
