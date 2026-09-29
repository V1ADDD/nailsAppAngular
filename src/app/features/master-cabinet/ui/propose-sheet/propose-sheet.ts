import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type ServiceProposal } from '@app/core/data/api';
import { SERVICE_CATALOG } from '@app/core/data/catalog';
import { Sheet } from '@app/shared/ui/sheet/sheet';

/** ТЗ 4.2 «Нет нужной услуги? Предложить» — goes to admin moderation. */
@Component({
  selector: 'app-propose-sheet',
  imports: [FormsModule, Sheet],
  template: `
    <app-sheet title="Предложить услугу" [(open)]="open">
      <form id="propose-form" class="form" (ngSubmit)="submit()">
        <p class="note">Администратор проверит название и добавит услугу в каталог.</p>
        <label class="field">
          <span class="field__label">Категория</span>
          <select class="input" name="category" [(ngModel)]="categoryId">
            @for (category of catalog; track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
        </label>
        <label class="field">
          <span class="field__label">Название услуги*</span>
          <input class="input" name="name" maxlength="80" [(ngModel)]="name" />
        </label>
      </form>
      <div sheetFooter>
        <button
          type="submit"
          form="propose-form"
          class="btn btn--gradient btn--block"
          [disabled]="saving() || !name().trim()"
        >
          Отправить на модерацию
        </button>
      </div>
    </app-sheet>
  `,
  styles: `
    .form {
      display: grid;
      gap: var(--space-4);
    }
    .note {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposeSheet {
  readonly open = model(false);
  readonly saving = input(false);
  readonly propose = output<ServiceProposal>();

  protected readonly catalog = SERVICE_CATALOG;
  protected readonly categoryId = linkedSignal({
    source: this.open,
    computation: () => SERVICE_CATALOG[0]!.id,
  });
  protected readonly name = linkedSignal({ source: this.open, computation: () => '' });

  protected submit(): void {
    if (!this.name().trim()) return;
    this.propose.emit({ categoryId: this.categoryId(), name: this.name().trim() });
  }
}
