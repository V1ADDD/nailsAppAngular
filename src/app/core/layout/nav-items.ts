import { type IconName } from '@app/shared/ui/icon/icons';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact: boolean;
  badge?: 'unread';
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Карта', icon: 'map', exact: true },
  { path: '/chats', label: 'Чаты', icon: 'message-square', exact: false, badge: 'unread' },
  { path: '/profile', label: 'Профиль', icon: 'user', exact: false },
];
