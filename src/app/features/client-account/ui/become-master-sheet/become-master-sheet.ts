import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { type BecomeMasterInput } from '@app/core/data/api';
import { SERVICE_CATALOG, findCategory } from '@app/core/data/catalog';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export const CITIES = ['Минск', 'Брест', 'Витебск', 'Гомель', 'Гродно', 'Могилёв'] as const;

interface Draft {
  categoryId: string;
  city: string;
  address: string;
}

let nextId = 0;

/** ТЗ 2.2: the master profile reuses the client's name, phone and photo; ask the rest. */
@Component({
  selector: 'app-become-master-sheet',
  imports: [Sheet],
  template: `
    <app-sheet title="Стать мастером" [(open)]="open">
      <form class="form" [id]="formId" (submit)="submit($event)">
        <p class="form__lead">
          Имя, телефон и фото перенесём из профиля клиента. Один аккаунт — две роли: переключайтесь
          между «Клиент» и «Мастер» в профиле.
        </p>
        <label class="field">
          <span class="field__label">Направление</span>
          <select class="input" name="category" required (change)="set('categoryId', $event)">
            <option value="" disabled [selected]="!draft().categoryId">Выберите направление</option>
            @for (category of categories; track category.id) {
              <option [value]="category.id" [selected]="draft().categoryId === category.id">
                {{ category.name }} — {{ category.specialty.toLowerCase() }}
              </option>
            }
          </select>
        </label>
        <label class="field">
          <span class="field__label">Город</span>
          <select class="input" name="city" (change)="set('city', $event)">
            @for (city of cities; track city) {
              <option [value]="city" [selected]="draft().city === city">{{ city }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span class="field__label">Адрес, где принимаете</span>
          <input
            class="input"
            name="address"
            autocomplete="street-address"
            placeholder="ул. Ленина, 42"
            required
            [value]="draft().address"
            (input)="set('address', $event)"
          />
          <span class="field__hint">Услуги, цены и расписание добавите в кабинете мастера</span>
        </label>
      </form>
      <div sheetFooter class="form__footer">
        <button type="button" class="btn btn--outline" (click)="open.set(false)">Отмена</button>
        <button
          type="submit"
          class="btn btn--gradient"
          [attr.form]="formId"
          [disabled]="!valid() || busy()"
        >
          Создать профиль мастера
        </button>
      </div>
    </app-sheet>
  `,
  styleUrl: '../profile-sheet/profile-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BecomeMasterSheet {
  readonly open = model(false);
  readonly busy = input(false);
  readonly submitted = output<BecomeMasterInput>();

  protected readonly formId = `become-master-${nextId++}`;
  protected readonly categories = SERVICE_CATALOG;
  protected readonly cities = CITIES;

  protected readonly draft = linkedSignal<boolean, Draft>({
    source: this.open,
    computation: () => ({ categoryId: '', city: CITIES[0], address: '' }),
  });
  protected readonly valid = computed(
    () => !!findCategory(this.draft().categoryId) && !!this.draft().address.trim(),
  );

  protected set(field: keyof Draft, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.draft.update((d) => ({ ...d, [field]: value }));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const d = this.draft();
    const category = findCategory(d.categoryId);
    if (!category || !this.valid() || this.busy()) return;
    this.submitted.emit({
      specialty: category.specialty,
      categoryIds: [category.id],
      city: d.city,
      address: d.address.trim(),
    });
  }
}
