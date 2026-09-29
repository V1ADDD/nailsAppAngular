import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { type PreferredContact } from '@app/core/data/models';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export const CONTACT_LABELS: Record<PreferredContact, string> = {
  messages: 'Сообщения в чате',
  phone: 'Телефонный звонок',
};

const OPTIONS: readonly { value: PreferredContact; label: string; hint: string }[] = [
  {
    value: 'messages',
    label: CONTACT_LABELS.messages,
    hint: 'Мастер напишет вам в чат на сайте',
  },
  { value: 'phone', label: CONTACT_LABELS.phone, hint: 'Мастер позвонит по вашему номеру' },
];

let nextId = 0;

/** ТЗ 7.2 / 7.6: how the client prefers masters to contact them. */
@Component({
  selector: 'app-contact-sheet',
  imports: [Sheet],
  template: `
    <app-sheet title="Способ связи" [(open)]="open">
      <form class="form" [id]="formId" (submit)="submit($event)">
        <fieldset class="options">
          <legend class="options__legend">Как мастерам лучше связываться с вами</legend>
          @for (option of options; track option.value) {
            <label class="option">
              <input
                type="radio"
                [name]="formId"
                [value]="option.value"
                [checked]="draft() === option.value"
                (change)="draft.set(option.value)"
              />
              <span class="option__text">
                <span>{{ option.label }}</span>
                <span class="field__hint">{{ option.hint }}</span>
              </span>
            </label>
          }
        </fieldset>
      </form>
      <div sheetFooter class="form__footer">
        <button type="button" class="btn btn--outline" (click)="open.set(false)">Отмена</button>
        <button type="submit" class="btn btn--primary" [attr.form]="formId" [disabled]="busy()">
          Сохранить
        </button>
      </div>
    </app-sheet>
  `,
  styleUrl: './contact-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSheet {
  readonly open = model(false);
  readonly value = input<PreferredContact>('messages');
  readonly busy = input(false);
  readonly save = output<PreferredContact>();

  protected readonly formId = `contact-form-${nextId++}`;
  protected readonly options = OPTIONS;
  protected readonly draft = linkedSignal({
    source: () => ({ open: this.open(), value: this.value() }),
    computation: ({ value }) => value,
  });

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.busy()) this.save.emit(this.draft());
  }
}
