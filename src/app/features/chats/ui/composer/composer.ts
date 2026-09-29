import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { type Message } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

export interface ComposerSend {
  text?: string;
  imageUrl?: string;
}

/**
 * Message input (ТЗ 8.1): text + one photo. Enter sends, Shift+Enter adds a line.
 * With `editing` set it edits that own message in place (ТЗ 8.5).
 */
@Component({
  selector: 'app-composer',
  imports: [Icon],
  template: `
    @if (editing()) {
      <div class="banner">
        <app-icon name="pencil" [size]="16" />
        <span class="banner__text">Редактирование сообщения</span>
        <button
          type="button"
          class="btn btn--icon btn--ghost btn--sm"
          (click)="editCancelled.emit()"
        >
          <app-icon name="x" [size]="18" label="Отменить редактирование" />
        </button>
      </div>
    }
    @if (imageUrl(); as url) {
      <div class="banner">
        <img class="banner__thumb" [src]="url" alt="Выбранное фото" />
        <span class="banner__text">Фото будет отправлено</span>
        <button type="button" class="btn btn--icon btn--ghost btn--sm" (click)="imageUrl.set(null)">
          <app-icon name="x" [size]="18" label="Убрать фото" />
        </button>
      </div>
    }
    <form class="composer" (submit)="$event.preventDefault(); submit()">
      @if (!editing()) {
        <button
          type="button"
          class="composer__icon"
          [disabled]="disabled()"
          (click)="fileInput.click()"
        >
          <app-icon name="image" [size]="24" label="Прикрепить фото" />
        </button>
        <input #fileInput type="file" accept="image/*" hidden (change)="onFile(fileInput)" />
      }
      <label class="visually-hidden" for="chat-composer">Сообщение</label>
      <textarea
        #textarea
        id="chat-composer"
        class="composer__input"
        rows="1"
        placeholder="Сообщение..."
        maxlength="2000"
        [disabled]="disabled()"
        [value]="text()"
        (input)="text.set(textarea.value)"
        (keydown.enter)="onEnter($event)"
      ></textarea>
      <button
        type="submit"
        class="composer__send"
        [class.composer__send--ready]="canSend()"
        [disabled]="!canSend()"
      >
        <app-icon
          [name]="editing() ? 'check' : 'send'"
          [size]="20"
          [label]="editing() ? 'Сохранить' : 'Отправить'"
        />
      </button>
    </form>
  `,
  styleUrl: './composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Composer {
  readonly editing = input<Message | null>(null);
  readonly disabled = input(false);
  readonly sending = input(false);

  readonly sent = output<ComposerSend>();
  readonly editSaved = output<{ id: string; text: string }>();
  readonly editCancelled = output<void>();

  protected readonly text = linkedSignal(() => this.editing()?.text ?? '');
  protected readonly imageUrl = signal<string | null>(null);
  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  protected readonly canSend = computed(() => {
    if (this.disabled() || this.sending()) return false;
    const hasText = this.text().trim().length > 0;
    return this.editing()
      ? hasText && this.text().trim() !== this.editing()!.text
      : hasText || !!this.imageUrl();
  });

  constructor() {
    // Focus the input when editing starts (DOM side effect).
    effect(() => {
      if (this.editing()) this.textarea().nativeElement.focus();
    });
  }

  protected onEnter(event: Event): void {
    if ((event as KeyboardEvent).shiftKey) return;
    event.preventDefault();
    this.submit();
  }

  protected onFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    // Mock upload: an object URL stands in for the uploaded file.
    if (file?.type.startsWith('image/')) this.imageUrl.set(URL.createObjectURL(file));
  }

  protected submit(): void {
    if (!this.canSend()) return;
    const text = this.text().trim();
    const editing = this.editing();
    if (editing) {
      this.editSaved.emit({ id: editing.id, text });
    } else {
      this.sent.emit({ text: text || undefined, imageUrl: this.imageUrl() ?? undefined });
      this.imageUrl.set(null);
    }
    this.text.set('');
  }
}
