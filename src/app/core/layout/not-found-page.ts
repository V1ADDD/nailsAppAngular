import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <section class="empty-state">
      <h1 class="display-title">Страница не найдена</h1>
      <p>Возможно, ссылка устарела или мастер удалил профиль.</p>
      <a routerLink="/" class="btn btn--primary">На карту</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
