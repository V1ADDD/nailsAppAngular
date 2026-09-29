import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { type BecomeMasterInput } from '@app/core/data/api';
import { type NotificationSettings, type PreferredContact } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { ClientAccountStore } from '../../../state/client-account.store';
import { BecomeMasterSheet } from '../../../ui/become-master-sheet/become-master-sheet';
import { CONTACT_LABELS, ContactSheet } from '../../../ui/contact-sheet/contact-sheet';
import { type InfoKind, InfoSheet } from '../../../ui/info-sheet/info-sheet';
import { PhoneSheet } from '../../../ui/phone-sheet/phone-sheet';
import { type ProfilePatch, ProfileSheet } from '../../../ui/profile-sheet/profile-sheet';
import { SettingsGroup } from '../../../ui/settings-group/settings-group';
import { SettingsRow } from '../../../ui/settings-row/settings-row';
import { SwitchRow } from '../../../ui/switch-row/switch-row';

type SheetKind = 'profile' | 'phone' | 'contact' | 'master' | InfoKind;

interface NotificationRow {
  key: keyof NotificationSettings;
  label: string;
  hint?: string;
}

/** ТЗ 8.4 channels (почта, сайт, push) + ТЗ 6.7 reminders. */
const NOTIFICATION_ROWS: readonly NotificationRow[] = [
  { key: 'push', label: 'Push-уведомления' },
  { key: 'email', label: 'Email' },
  { key: 'site', label: 'На сайте' },
  { key: 'reminders', label: 'Напоминания о записях', hint: 'За 24 ч и за 2 ч до визита' },
];

/** «Настройки»: account, notifications, info, «Стать мастером» and logout. */
@Component({
  selector: 'app-settings-panel',
  imports: [
    BecomeMasterSheet,
    ContactSheet,
    Icon,
    InfoSheet,
    PhoneSheet,
    ProfileSheet,
    RouterLink,
    SettingsGroup,
    SettingsRow,
    SwitchRow,
  ],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPanel {
  protected readonly store = inject(ClientAccountStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly notificationRows = NOTIFICATION_ROWS;
  protected readonly sheet = signal<SheetKind | null>(null);
  protected readonly infoKind = signal<InfoKind>('about');

  protected readonly notifications = computed(
    () => this.session.snapshot()?.account.notifications ?? null,
  );
  protected readonly contactLabel = computed(() => {
    const client = this.session.client();
    return client ? CONTACT_LABELS[client.preferredContact] : '';
  });

  protected isOpen(kind: SheetKind): boolean {
    return this.sheet() === kind;
  }

  protected setOpen(kind: SheetKind, open: boolean): void {
    if (open) this.sheet.set(kind);
    else if (this.sheet() === kind) this.sheet.set(null);
  }

  protected openInfo(kind: InfoKind): void {
    this.infoKind.set(kind);
    this.sheet.set(kind);
  }

  protected isInfoOpen(): boolean {
    return this.sheet() === this.infoKind();
  }

  protected async saveProfile(
    patch: ProfilePatch | { phone: string } | { preferredContact: PreferredContact },
  ): Promise<void> {
    const client = await this.store.updateProfile(patch);
    if (!client) {
      this.toast.error(this.store.actionError() ?? 'Не удалось сохранить');
      return;
    }
    this.session.load();
    this.sheet.set(null);
    this.toast.success('Сохранено');
  }

  /** Optimistic toggle; reloads the session to roll back when the save fails. */
  protected async toggleNotification(
    key: keyof NotificationSettings,
    value: boolean,
  ): Promise<void> {
    const snapshot = this.session.snapshot();
    if (!snapshot) return;
    const { account } = snapshot;
    this.session.setSnapshot({
      ...snapshot,
      account: { ...account, notifications: { ...account.notifications, [key]: value } },
    });
    const saved = await this.store.updateNotifications({ [key]: value });
    const current = this.session.snapshot();
    if (saved && current) {
      this.session.setSnapshot({ ...current, account: saved });
    } else if (!saved) {
      this.toast.error(this.store.actionError() ?? 'Не удалось сохранить настройку');
      this.session.load();
    }
  }

  protected async becomeMaster(input: BecomeMasterInput): Promise<void> {
    const snapshot = await this.store.becomeMaster(input);
    if (!snapshot) {
      this.toast.error(this.store.actionError() ?? 'Не удалось создать профиль мастера');
      return;
    }
    this.session.setSnapshot(snapshot);
    this.sheet.set(null);
    this.toast.success('Профиль мастера создан');
    void this.router.navigate(['/profile/master']);
  }

  protected logout(): void {
    this.session.logout();
    void this.router.navigate(['/']);
  }
}
