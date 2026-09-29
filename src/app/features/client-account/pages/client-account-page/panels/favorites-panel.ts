import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Master } from '@app/core/data/models';
import { SessionStore } from '@app/core/session/session.store';
import { Icon } from '@app/shared/ui/icon/icon';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { ClientAccountStore } from '../../../state/client-account.store';
import { FavoriteCard } from '../../../ui/favorite-card/favorite-card';
import { PanelState } from '../../../ui/panel-state/panel-state';

/** «Избранное»: masters the client saved; the heart removes one straight away. */
@Component({
  selector: 'app-favorites-panel',
  imports: [FavoriteCard, Icon, PanelState, RouterLink],
  template: `
    <h2 class="visually-hidden">Избранные мастера</h2>
    @if (store.mastersLoading() || store.mastersError()) {
      <app-panel-state [error]="store.mastersError()" (retry)="store.loadMasters()" />
    } @else {
      <ul class="list">
        @for (master of favorites(); track master.id) {
          <li><app-favorite-card [master]="master" (remove)="remove(master)" /></li>
        }
      </ul>
      @if (favorites().length === 0) {
        <div class="empty-state">
          <app-icon name="heart" [size]="36" />
          <p class="empty-state__title">В избранном пока пусто</p>
          <p>Нажмите на сердечко в профиле мастера, чтобы сохранить его здесь.</p>
          <a class="btn btn--primary" routerLink="/">Найти мастера</a>
        </div>
      }
    }
  `,
  styleUrl: './favorites-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesPanel {
  protected readonly store = inject(ClientAccountStore);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);

  protected readonly favorites = computed(() => {
    const ids = this.session.favoriteIds();
    return this.store.masters().filter((m) => ids.has(m.id));
  });

  protected remove(master: Master): void {
    this.session.toggleFavorite(master.id);
    this.toast.show(`Удалено из избранного: ${master.name}`);
  }
}
