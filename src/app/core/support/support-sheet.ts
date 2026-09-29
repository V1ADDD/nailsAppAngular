import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupportApi } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { Sheet } from '@app/shared/ui/sheet/sheet';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { SupportService } from './support.service';

@Component({
  selector: 'app-support-sheet',
  imports: [FormsModule, Sheet],
  template: `
    <app-sheet title="Напишите нам" [(open)]="support.isOpen">
      <form id="support-form" class="form" (ngSubmit)="send()">
        <p class="lead">Вопрос, жалоба или идея — ответим в течение дня.</p>
        <label class="field">
          <span class="field__label">Сообщение</span>
          <textarea class="input" name="text" required [(ngModel)]="text" rows="4"></textarea>
        </label>
        <label class="field">
          <span class="field__label">Как с вами связаться</span>
          <input
            class="input"
            name="contact"
            [(ngModel)]="contact"
            placeholder="Телефон или почта"
          />
        </label>
      </form>
      <button
        sheetFooter
        type="submit"
        form="support-form"
        class="btn btn--primary btn--block"
        [disabled]="sending()"
      >
        {{ sending() ? 'Отправляем…' : 'Отправить' }}
      </button>
    </app-sheet>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .lead {
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupportSheet {
  protected readonly support = inject(SupportService);
  private readonly api = inject(SupportApi);
  private readonly toast = inject(ToastService);
  private readonly session = inject(SessionStore);

  protected text = '';
  protected contact = this.session.client()?.phone ?? '';
  protected readonly sending = signal(false);

  protected send(): void {
    if (!this.text.trim()) {
      this.toast.error('Напишите, чем мы можем помочь');
      return;
    }
    this.sending.set(true);
    this.api.send({ text: this.text, contact: this.contact }).subscribe({
      next: () => {
        this.sending.set(false);
        this.text = '';
        this.support.isOpen.set(false);
        this.toast.success('Сообщение отправлено, скоро ответим');
      },
      error: (e: Error) => {
        this.sending.set(false);
        this.toast.error(e.message);
      },
    });
  }
}
