import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '@app/shared/ui/logo/logo';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, Logo],
  template: `
    <section class="empty-state">
      <app-logo variant="mark" [size]="56" />
      <h1 class="display-title">Страница не найдена</h1>
      <p>Возможно, ссылка устарела или мастер удалил профиль.</p>
      <a routerLink="/" class="btn btn--primary">На карту</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
