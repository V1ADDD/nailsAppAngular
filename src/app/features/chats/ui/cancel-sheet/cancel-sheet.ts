import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export const CANCEL_REASONS = ['Изменились планы', 'Заболела', 'Не успеваю', 'Другое'] as const;
const OTHER = 'Другое';

export interface CancelSubmit {
  reason: string;
  mutual: boolean;
}

/** ТЗ 6.5: cancelling needs a reason; a mutual cancellation has no consequences. */
@Component({
  selector: 'app-cancel-sheet',
  imports: [Icon, Sheet],
  template: `
    <app-sheet title="Отмена записи" [(open)]="open">
      <form id="cancel-form" class="form" (submit)="$event.preventDefault(); submit()">
        <fieldset class="reasons">
          <legend class="field__label">Причина отмены</legend>
          @for (reason of reasons; track reason) {
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="preset() === reason"
              (click)="preset.set(reason)"
            >
              {{ reason }}
            </button>
          }
        </fieldset>

        @if (preset() === other) {
          <div class="field">
            <label class="field__label" for="cancel-reason">Опишите причину</label>
            <textarea
              #detailsEl
              id="cancel-reason"
              class="input"
              maxlength="300"
              [value]="details()"
              (input)="details.set(detailsEl.value)"
            ></textarea>
          </div>
        }

        <label class="check">
          <input
            #mutualBox
            type="checkbox"
            [checked]="mutual()"
            (change)="mutual.set(mutualBox.checked)"
          />
          <span>Отмена по договорённости (без последствий)</span>
        </label>

        @if (!mutual()) {
          <p class="warning" role="note">
            <app-icon name="alert-triangle" [size]="18" />
            Отмена без взаимного согласия снижает рейтинг
          </p>
        }
      </form>
      <div sheetFooter class="footer">
        <button type="button" class="btn btn--outline" (click)="open.set(false)">Назад</button>
        <button
          type="submit"
          form="cancel-form"
          class="btn btn--danger-soft"
          [disabled]="!reason() || busy()"
        >
          Отменить запись
        </button>
      </div>
    </app-sheet>
  `,
  styleUrl: './cancel-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelSheet {
  readonly open = model(false);
  readonly busy = input(false);
  readonly submitted = output<CancelSubmit>();

  protected readonly reasons = CANCEL_REASONS;
  protected readonly other = OTHER;

  // Reset the form every time the sheet opens.
  protected readonly preset = linkedSignal<boolean, string | null>({
    source: this.open,
    computation: () => null,
  });
  protected readonly details = linkedSignal({ source: this.open, computation: () => '' });
  protected readonly mutual = linkedSignal({ source: this.open, computation: () => false });

  protected readonly reason = computed(() => {
    const preset = this.preset();
    if (preset === OTHER) return this.details().trim();
    return preset ?? '';
  });

  protected submit(): void {
    const reason = this.reason();
    if (!reason) return;
    this.submitted.emit({ reason, mutual: this.mutual() });
  }
}
