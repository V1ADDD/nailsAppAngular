import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { subcategoryName } from '@app/core/data/catalog';
import { PricePipe } from '@app/shared/format/price';
import { type ServiceGroup, formatDuration } from '../../state/profile-helpers';
import { ProfileSection } from '../profile-section/profile-section';

/** ТЗ 4.2: the master's services grouped by category, each with a quick «Записаться». */
@Component({
  selector: 'app-service-list',
  imports: [PricePipe, ProfileSection],
  template: `
    <app-profile-section heading="Услуги и цены" icon="scissors">
      @if (groups().length === 0) {
        <p class="empty">Мастер пока не добавил услуги</p>
      }
      @for (group of groups(); track group.categoryId) {
        <div class="group">
          <h3 class="section-caption">{{ group.name }}</h3>
          <ul class="list" role="list">
            @for (service of group.services; track service.id) {
              <li class="row">
                <div class="row__info">
                  <span class="row__name">{{ name(service.subcategoryId) }}</span>
                  <span class="row__duration">{{ duration(service.durationMin) }}</span>
                </div>
                <div class="row__side">
                  <span class="row__price">{{ service.price | price }}</span>
                  @if (bookable()) {
                    <button
                      type="button"
                      class="btn btn--sm btn--pill row__book"
                      [attr.aria-label]="'Записаться: ' + name(service.subcategoryId)"
                      (click)="book.emit(service.subcategoryId)"
                    >
                      Записаться
                    </button>
                  }
                </div>
              </li>
            }
          </ul>
        </div>
      }
    </app-profile-section>
  `,
  styleUrl: './service-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceList {
  readonly groups = input.required<readonly ServiceGroup[]>();
  readonly bookable = input(true);
  readonly book = output<string>();

  protected readonly name = subcategoryName;
  protected readonly duration = formatDuration;
}
