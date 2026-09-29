import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { type Client } from '@app/core/data/models';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export type ProfilePatch = Pick<Client, 'name' | 'email' | 'telegram' | 'viber'>;
type Field = keyof ProfilePatch;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let nextId = 0;

/** «Редактировать профиль»: name, email and messenger handles. */
@Component({
  selector: 'app-profile-sheet',
  imports: [Sheet],
  template: `
    <app-sheet title="Редактировать профиль" [(open)]="open">
      <form class="form" [id]="formId" (submit)="submit($event)">
        <label class="field">
          <span class="field__label">Имя и фамилия</span>
          <input
            class="input"
            name="name"
            autocomplete="name"
            required
            [value]="draft().name"
            (input)="set('name', $event)"
          />
        </label>
        <label class="field">
          <span class="field__label">Электронная почта</span>
          <input
            class="input"
            type="email"
            name="email"
            autocomplete="email"
            [value]="draft().email"
            (input)="set('email', $event)"
          />
          @if (emailInvalid()) {
            <span class="field__error">Проверьте адрес почты</span>
          }
        </label>
        <label class="field">
          <span class="field__label">Telegram</span>
          <input
            class="input"
            name="telegram"
            placeholder="@username"
            [value]="draft().telegram ?? ''"
            (input)="set('telegram', $event)"
          />
        </label>
        <label class="field">
          <span class="field__label">Viber</span>
          <input
            class="input"
            type="tel"
            name="viber"
            placeholder="+375 29 123-45-67"
            [value]="draft().viber ?? ''"
            (input)="set('viber', $event)"
          />
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
  styleUrl: './profile-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSheet {
  readonly open = model(false);
  readonly client = input<Client | null>(null);
  readonly busy = input(false);
  readonly save = output<ProfilePatch>();

  protected readonly formId = `profile-form-${nextId++}`;

  protected readonly draft = linkedSignal<{ open: boolean; client: Client | null }, ProfilePatch>({
    source: () => ({ open: this.open(), client: this.client() }),
    computation: ({ client }) => ({
      name: client?.name ?? '',
      email: client?.email ?? '',
      telegram: client?.telegram ?? '',
      viber: client?.viber ?? '',
    }),
  });

  protected readonly emailInvalid = computed(() => {
    const email = this.draft().email.trim();
    return !!email && !EMAIL.test(email);
  });
  protected readonly valid = computed(() => !!this.draft().name.trim() && !this.emailInvalid());

  protected set(field: Field, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.valid() || this.busy()) return;
    const d = this.draft();
    this.save.emit({
      name: d.name.trim(),
      email: d.email.trim(),
      telegram: d.telegram?.trim() || undefined,
      viber: d.viber?.trim() || undefined,
    });
  }
}
