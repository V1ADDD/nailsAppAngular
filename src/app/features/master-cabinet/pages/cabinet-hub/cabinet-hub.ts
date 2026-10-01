import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PORTFOLIO_LIMIT } from '@app/core/data/api';
import { plural } from '@app/shared/format/plural';
import { formatAmount } from '@app/shared/format/price';
import { NBSP } from '@app/shared/format/text';
import { Icon } from '@app/shared/ui/icon/icon';
import { CABINET_PAGES, type CabinetPage } from '../../state/cabinet-pages';
import { CabinetStore } from '../../state/cabinet.store';
import { workDaysLabel } from '../../state/schedule-logic';

const VERIFICATION = {
  none: 'Не пройдена',
  pending: 'На проверке',
  verified: 'Подтверждена',
  rejected: 'Отклонена',
};

interface Tile extends CabinetPage {
  metric: string;
  /** 0–100: a progress bar under the metric. */
  progress?: number;
  /** Something needs the master's attention. */
  alert?: boolean;
}

/** /profile/master — hub: today at a glance + a tile per cabinet page. */
@Component({
  selector: 'app-cabinet-hub',
  imports: [DatePipe, Icon, RouterLink],
  templateUrl: './cabinet-hub.html',
  styleUrl: './cabinet-hub.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetHub {
  protected readonly store = inject(CabinetStore);
  protected readonly now = new Date();

  protected readonly greeting = computed(() => {
    const hour = Number(
      new Intl.DateTimeFormat('ru-BY', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'Europe/Minsk',
      }).format(new Date()),
    );
    const name = this.store.master()?.name.split(' ')[0] ?? '';
    const hello =
      hour < 5
        ? 'Доброй ночи'
        : hour < 12
          ? 'Доброе утро'
          : hour < 18
            ? 'Добрый день'
            : 'Добрый вечер';
    return name ? `${hello}, ${name}` : hello;
  });

  protected readonly todayText = computed(() => {
    const { count } = this.store.today();
    return count ? plural(count, ['запись', 'записи', 'записей']) : 'Записей нет';
  });

  protected readonly freeText = computed(() => {
    const free = this.store.today().free;
    return free
      ? `ещё ${plural(free, ['свободное окно', 'свободных окна', 'свободных окон'])}`
      : '';
  });

  protected readonly pendingText = computed(() => {
    const count = this.store.pendingCount();
    return count ? `${plural(count, ['запись ждёт', 'записи ждут', 'записей ждут'])} ответа` : '';
  });

  protected readonly tiles = computed<Tile[]>(() => {
    const master = this.store.master();
    const month = this.store.stats().month;
    const pending = this.store.pendingCount();
    const percent = this.store.completeness()?.percent ?? 0;
    const schedule = master?.schedule;
    const metrics: Record<string, Omit<Tile, keyof CabinetPage>> = {
      schedule: {
        metric: this.store.errors().schedule
          ? 'Не удалось загрузить'
          : pending
            ? `Ждут подтверждения: ${pending}`
            : `Сегодня: ${this.todayText().toLowerCase()}`,
        alert: pending > 0,
      },
      clients: {
        metric: this.store.clients().length
          ? plural(this.store.clients().length, ['клиент', 'клиента', 'клиентов'])
          : 'Пока никого',
      },
      stats: {
        metric: month
          ? `≈${NBSP}${formatAmount(month.expectedRevenue)} ожидается за месяц`
          : 'Выручка и визиты',
      },
      services: {
        metric: master?.services.length
          ? plural(master.services.length, ['услуга', 'услуги', 'услуг'])
          : 'Добавьте прайс',
        alert: !master?.services.length,
      },
      settings: {
        metric: schedule
          ? `${workDaysLabel(schedule.workDays)} · ${schedule.from}–${schedule.to}`
          : 'Часы работы',
      },
      card: { metric: `Заполнена на ${percent}%`, progress: percent },
      portfolio: { metric: `${master?.portfolio.length ?? 0} из ${PORTFOLIO_LIMIT} фото` },
      verification: { metric: VERIFICATION[master?.verification ?? 'none'] },
    };
    return CABINET_PAGES.map((page) => ({
      ...page,
      ...metrics[page.path],
      metric: metrics[page.path]?.metric ?? '',
    }));
  });
}
