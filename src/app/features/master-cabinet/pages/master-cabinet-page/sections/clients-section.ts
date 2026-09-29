import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { CabinetStore } from '../../../state/cabinet.store';
import { CabinetSection } from '../../../ui/cabinet-section/cabinet-section';
import { ClientCard } from '../../../ui/client-card/client-card';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 3. «Клиенты» (ТЗ 7.2, 7.4): sorted by the nearest booking, searchable. */
@Component({
  selector: 'app-clients-section',
  imports: [CabinetSection, ClientCard, Icon],
  template: `
    <app-cabinet-section
      sectionId="clients"
      title="Клиенты"
      icon="users"
      [open]="store.openSections().clients"
      [badge]="badge()"
      (toggled)="store.toggleSection('clients')"
    >
      <div class="clients">
        <label class="search">
          <app-icon name="search" [size]="18" />
          <span class="visually-hidden">Поиск клиентов</span>
          <input
            class="input input--sunken"
            type="search"
            placeholder="Имя, услуга, дата («28 авг») или время"
            [value]="store.clientQuery()"
            #query
            (input)="store.setClientQuery(query.value)"
          />
        </label>

        @if (store.loading().clients && !store.clients().length) {
          <div class="list" aria-busy="true" aria-label="Загружаем клиентов">
            <div class="skeleton clients__skeleton"></div>
            <div class="skeleton clients__skeleton"></div>
          </div>
        } @else if (store.errors().clients) {
          <div class="empty-state" role="alert">
            <p class="empty-state__title">Не удалось загрузить клиентов</p>
            <button type="button" class="btn btn--outline btn--sm" (click)="store.retry('clients')">
              Повторить
            </button>
          </div>
        } @else if (!store.clients().length) {
          <div class="empty-state">
            <p class="empty-state__title">Клиентов пока нет</p>
            <p>Они появятся после первых записей через сайт.</p>
          </div>
        } @else if (!store.filteredClients().length) {
          <div class="empty-state">
            <p class="empty-state__title">Никого не нашли</p>
            <p>Попробуйте имя, услугу, дату («28 авг») или время («10:30»).</p>
          </div>
        } @else {
          <ul class="list">
            @for (entry of store.filteredClients(); track entry.client.id) {
              <li>
                <app-client-card
                  [entry]="entry"
                  [busy]="store.saving()"
                  (write)="message($event)"
                />
              </li>
            }
          </ul>
        }
      </div>
    </app-cabinet-section>
  `,
  styles: `
    .clients,
    .list {
      display: grid;
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .search {
      position: relative;
      display: block;
      app-icon {
        position: absolute;
        top: 50%;
        left: var(--space-3);
        color: var(--color-text-muted);
        transform: translateY(-50%);
      }
      .input {
        padding-left: var(--space-10);
      }
    }
    .clients__skeleton {
      height: 8rem;
      border-radius: var(--radius-md);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsSection {
  protected readonly store = inject(CabinetStore);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly feedback = injectCabinetFeedback();

  protected readonly badge = computed(() => {
    const count = this.store.clients().length;
    return count ? String(count) : null;
  });

  protected message(clientId: string): void {
    this.store.openChat(
      clientId,
      this.feedback.done<string>(undefined, (chatId) => {
        this.session.setRole('master');
        void this.router.navigate(['/chats', chatId]);
      }),
    );
  }
}
