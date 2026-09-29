import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { Sheet } from '@app/shared/ui/sheet/sheet';

/** Belarusian mobile number: +375, operator code, 7 digits; spaces, dashes, brackets allowed. */
const BY_PHONE = /^\+375\d{9}$/;

export function isBelarusPhone(value: string): boolean {
  return BY_PHONE.test(value.replace(/[\s()-]/g, ''));
}

let nextId = 0;

/** «Телефон»: change the account phone number. */
@Component({
  selector: 'app-phone-sheet',
  imports: [Sheet],
  template: `
    <app-sheet title="Телефон" [(open)]="open">
      <form class="form" [id]="formId" (submit)="submit($event)">
        <p class="form__lead">
          По этому номеру вы входите в аккаунт, его видят мастера, к которым вы записаны.
        </p>
        <label class="field">
          <span class="field__label">Номер телефона</span>
          <input
            class="input"
            type="tel"
            name="phone"
            autocomplete="tel"
            inputmode="tel"
            required
            [attr.aria-describedby]="hintId"
            [attr.aria-invalid]="touched() && !valid()"
            [value]="draft()"
            (input)="onInput($event)"
            (blur)="touched.set(true)"
          />
          <span class="field__hint" [id]="hintId">Формат: +375 29 123-45-67</span>
          @if (touched() && !valid()) {
            <span class="field__error">Введите белорусский номер в формате +375 XX XXX-XX-XX</span>
          }
        </label>
      </form>
      <div sheetFooter class="form__footer">
        <button type="button" class="btn btn--outline" (click)="open.set(false)">Отмена</button>
        <button
          type="submit"
          class="btn btn--primary"
          [attr.form]="formId"
          [disabled]="!valid() || busy()"
        >
          Сохранить
        </button>
      </div>
    </app-sheet>
  `,
  styleUrl: '../profile-sheet/profile-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhoneSheet {
  readonly open = model(false);
  readonly phone = input('');
  readonly busy = input(false);
  readonly save = output<string>();

  protected readonly formId = `phone-form-${nextId++}`;
  protected readonly hintId = `${this.formId}-hint`;
  protected readonly draft = linkedSignal({
    source: () => ({ open: this.open(), phone: this.phone() }),
    computation: ({ phone }) => phone,
  });
  protected readonly touched = linkedSignal({ source: this.open, computation: () => false });
  protected readonly valid = computed(() => isBelarusPhone(this.draft()));

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.touched.set(true);
    if (!this.valid() || this.busy()) return;
    this.save.emit(this.draft().trim());
  }
}
