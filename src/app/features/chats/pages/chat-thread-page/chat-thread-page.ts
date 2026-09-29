import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-chat-thread-page',
  template: `<section class="empty-state">
    <h1 class="display-title">Чат</h1>
    <p>Скоро здесь будет экран.</p>
  </section>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatThreadPage {}
