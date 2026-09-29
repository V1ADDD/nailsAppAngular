import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Sheet } from '@app/shared/ui/sheet/sheet';

export type InfoKind = 'language' | 'about' | 'rules';

const TITLES: Record<InfoKind, string> = {
  language: 'Язык',
  about: 'О приложении',
  rules: 'Правила использования',
};

/** Static «Прочее» sheets: language, about, and the usage rules (ТЗ 11.3). */
@Component({
  selector: 'app-info-sheet',
  imports: [Sheet],
  template: `
    <app-sheet [title]="title()" [(open)]="open">
      <div class="info">
        @switch (kind()) {
          @case ('language') {
            <p class="info__current">Русский</p>
            <p>Сейчас приложение доступно только на русском языке. Другие языки появятся позже.</p>
          }
          @case ('about') {
            <p class="info__lead">
              Карта бьюти-мастеров Беларуси с точными ценами и онлайн-записью.
            </p>
            <p>
              Находите мастеров рядом, сравнивайте цены на услуги, смотрите портфолио и отзывы,
              записывайтесь на свободное время и общайтесь с мастером в чате.
            </p>
            <p class="info__muted">Версия 1.0 MVP</p>
          }
          @case ('rules') {
            <ol class="info__list">
              <li>Не публикуйте оскорбления, спам, рекламу и неприемлемые фото.</li>
              <li>
                Отмена записи возможна только с указанием причины. Отмена по договорённости с
                мастером проходит без последствий, односторонняя — снижает рейтинг.
              </li>
              <li>Отзывы должны описывать реальный визит.</li>
              <li>
                За нарушения аккаунт блокируется по нарастающей: 1 день → 3 дня → 7 дней → 30 дней →
                навсегда.
              </li>
              <li>
                С блокировкой можно не согласиться: напишите в поддержку, и модератор пересмотрит
                решение.
              </li>
            </ol>
          }
        }
      </div>
      <div sheetFooter class="info__footer">
        <button type="button" class="btn btn--primary btn--block" (click)="open.set(false)">
          Понятно
        </button>
      </div>
    </app-sheet>
  `,
  styles: `
    .info {
      display: grid;
      gap: var(--space-3);
      color: var(--color-text-secondary);
    }
    .info__current,
    .info__lead {
      font-weight: var(--font-weight-bold);
      color: var(--color-text);
    }
    .info__muted {
      font-size: var(--font-size-sm);
      color: var(--color-text-muted);
    }
    .info__list {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding-inline-start: var(--space-5);
    }
    .info__footer {
      flex: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoSheet {
  readonly open = model(false);
  readonly kind = input<InfoKind>('about');
  protected readonly title = computed(() => TITLES[this.kind()]);
}
