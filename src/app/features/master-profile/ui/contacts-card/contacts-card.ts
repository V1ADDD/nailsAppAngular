import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type Contacts } from '@app/core/data/models';
import { Icon } from '@app/shared/ui/icon/icon';
import { type IconName } from '@app/shared/ui/icon/icons';
import { ProfileSection } from '../profile-section/profile-section';

interface ContactRow {
  label: string;
  value: string;
  href: string;
  icon: IconName;
  external: boolean;
}

/** Master's contacts (ТЗ 5.5): phone, e-mail and messengers as links. */
@Component({
  selector: 'app-contacts-card',
  imports: [Icon, ProfileSection],
  template: `
    <app-profile-section heading="Контакты" icon="phone">
      <ul class="list" role="list">
        @for (row of rows(); track row.label) {
          <li>
            <a
              class="row"
              [href]="row.href"
              [attr.target]="row.external ? '_blank' : null"
              [attr.rel]="row.external ? 'noopener noreferrer' : null"
            >
              <span class="row__icon"><app-icon [name]="row.icon" [size]="18" /></span>
              <span class="row__text">
                <span class="row__label">{{ row.label }}</span>
                <span class="row__value">{{ row.value }}</span>
              </span>
            </a>
          </li>
        }
      </ul>
    </app-profile-section>
  `,
  styles: `
    :host {
      display: block;
    }
    .list {
      display: grid;
      gap: var(--space-1);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-height: var(--tap-target);
      padding: var(--space-1) var(--space-2);
      margin: 0 calc(var(--space-2) * -1);
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
      &:hover {
        background: var(--color-surface-muted);
      }
    }
    .row__icon {
      display: inline-grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      color: var(--color-text-secondary);
      background: var(--color-surface-muted);
      border-radius: var(--radius-full);
    }
    .row__text {
      display: grid;
      min-width: 0;
    }
    .row__label {
      font-size: var(--font-size-xs);
      color: var(--color-text-secondary);
    }
    .row__value {
      font-weight: var(--font-weight-semibold);
      overflow-wrap: anywhere;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactsCard {
  readonly contacts = input.required<Contacts>();

  protected readonly rows = computed<ContactRow[]>(() => {
    const c = this.contacts();
    const handle = (v: string) => v.replace(/^@/, '');
    const rows: ContactRow[] = [];
    if (c.phone) {
      const tel = c.phone.replace(/[^\d+]/g, '');
      rows.push({
        label: 'Телефон',
        value: c.phone,
        href: `tel:${tel}`,
        icon: 'phone',
        external: false,
      });
    }
    if (c.email) {
      rows.push({
        label: 'E-mail',
        value: c.email,
        href: `mailto:${c.email}`,
        icon: 'mail',
        external: false,
      });
    }
    if (c.telegram) {
      rows.push({
        label: 'Telegram',
        value: `@${handle(c.telegram)}`,
        href: `https://t.me/${handle(c.telegram)}`,
        icon: 'send',
        external: true,
      });
    }
    if (c.viber) {
      rows.push({
        label: 'Viber',
        value: c.viber,
        href: `viber://chat?number=${encodeURIComponent(c.viber.replace(/[^\d+]/g, ''))}`,
        icon: 'message-square',
        external: false,
      });
    }
    if (c.instagram) {
      rows.push({
        label: 'Instagram',
        value: `@${handle(c.instagram)}`,
        href: `https://instagram.com/${handle(c.instagram)}`,
        icon: 'instagram',
        external: true,
      });
    }
    return rows;
  });
}
