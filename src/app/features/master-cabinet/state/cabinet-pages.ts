import { type IconName } from '@app/shared/ui/icon/icons';

export type Tint = 'lilac' | 'pink' | 'mint' | 'sky' | 'amber';

export interface CabinetPage {
  path: string;
  title: string;
  icon: IconName;
  tint: Tint;
}

/** Pages of the master cabinet (ТЗ 4, 6, 7), in hub / side-menu order. */
export const CABINET_PAGES: readonly CabinetPage[] = [
  { path: 'schedule', title: 'Расписание', icon: 'calendar', tint: 'lilac' },
  { path: 'clients', title: 'Клиенты', icon: 'users', tint: 'sky' },
  { path: 'stats', title: 'Статистика', icon: 'bar-chart', tint: 'mint' },
  { path: 'services', title: 'Услуги и цены', icon: 'scissors', tint: 'pink' },
  { path: 'settings', title: 'Рабочий график', icon: 'clock', tint: 'amber' },
  { path: 'card', title: 'Моя карточка', icon: 'id-card', tint: 'lilac' },
  { path: 'portfolio', title: 'Портфолио', icon: 'image', tint: 'pink' },
  { path: 'verification', title: 'Верификация', icon: 'shield-check', tint: 'mint' },
];

export function cabinetPage(path: string): CabinetPage {
  return CABINET_PAGES.find((p) => p.path === path) ?? CABINET_PAGES[0]!;
}
