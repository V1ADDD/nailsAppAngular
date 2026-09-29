import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { type Message } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';

/**
 * A text/photo message. Own messages (ТЗ 8.5) get a «…» menu (also on long-press /
 * right-click) with «Изменить» and «Удалить».
 */
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, Icon],
  host: {
    '[class.own]': 'own()',
    '(keydown.escape)': 'menuOpen.set(false)',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    @let m = message();
    <div class="wrap">
      <!-- Long-press on touch fires contextmenu; the «…» button is the accessible path. -->
      <div
        class="bubble"
        [class.bubble--own]="own()"
        [class.bubble--deleted]="m.deleted"
        [class.bubble--photo]="m.imageUrl && !m.text"
        (contextmenu)="onContextMenu($event)"
      >
        @if (m.deleted) {
          <p class="bubble__text">Сообщение удалено</p>
        } @else {
          @if (m.imageUrl) {
            <button type="button" class="bubble__photo" (click)="imageOpened.emit(m.imageUrl)">
              <img [src]="m.imageUrl" alt="Фото из чата" />
              <span class="visually-hidden">Открыть фото</span>
            </button>
          }
          @if (m.text) {
            <p class="bubble__text">{{ m.text }}</p>
          }
        }
        <span class="bubble__meta">
          @if (m.editedAt && !m.deleted) {
            <span>изменено</span>
          }
          <time [attr.datetime]="m.sentAt">{{ m.sentAt | date: 'HH:mm' }}</time>
          @if (own()) {
            <app-icon
              [name]="read() ? 'check-check' : 'check'"
              [size]="14"
              [label]="read() ? 'Прочитано' : 'Отправлено'"
            />
          }
        </span>
      </div>

      @if (own() && !m.deleted) {
        <div class="actions">
          <button
            type="button"
            class="actions__toggle"
            aria-label="Действия с сообщением"
            [attr.aria-expanded]="menuOpen()"
            (click)="menuOpen.set(!menuOpen())"
          >
            <app-icon name="more-horizontal" [size]="18" />
          </button>
          @if (menuOpen()) {
            <div class="menu" role="menu">
              @if (m.text) {
                <button type="button" role="menuitem" (click)="pick('edit')">
                  <app-icon name="pencil" [size]="16" /> Изменить
                </button>
              }
              <button type="button" role="menuitem" class="menu__danger" (click)="pick('remove')">
                <app-icon name="trash" [size]="16" /> Удалить
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './message-bubble.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBubble {
  readonly message = input.required<Message>();
  readonly own = input(false);
  /** The counterpart has read this own message. */
  readonly read = input(false);

  readonly edited = output<Message>();
  readonly removed = output<Message>();
  readonly imageOpened = output<string>();

  protected readonly menuOpen = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onDocumentClick(event: Event): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  protected onContextMenu(event: Event): void {
    if (!this.own() || this.message().deleted) return;
    event.preventDefault();
    this.menuOpen.set(true);
  }

  protected pick(action: 'edit' | 'remove'): void {
    this.menuOpen.set(false);
    if (action === 'edit') this.edited.emit(this.message());
    else this.removed.emit(this.message());
  }
}
