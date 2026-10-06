import { type IconName } from '@app/shared/ui/icon/icons';

export type Tint = 'lilac' | 'pink' | 'mint' | 'sky' | 'amber';

export interface CabinetPage {
  path: string;
  title: string;
  icon: IconName;
  tint: Tint;
}

/** The five cabinet sections (hub / side-menu order); each groups its own tabs. */
export const CABINET_PAGES: readonly CabinetPage[] = [
  { path: 'profile', title: 'Профиль', icon: 'id-card', tint: 'lilac' },
  { path: 'bookings', title: 'Записи', icon: 'calendar', tint: 'sky' },
  { path: 'schedule', title: 'График', icon: 'clock', tint: 'amber' },
  { path: 'income', title: 'Доходы', icon: 'bar-chart', tint: 'mint' },
  { path: 'settings', title: 'Настройки', icon: 'sliders-horizontal', tint: 'pink' },
];

export function cabinetPage(path: string): CabinetPage {
  return CABINET_PAGES.find((p) => p.path === path) ?? CABINET_PAGES[0]!;
}

/** Tabs inside «Профиль». */
export type ProfileTab = 'about' | 'services' | 'portfolio';
/** Tabs inside «Записи». */
export type BookingsTab = 'schedule' | 'clients';
