import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@app/shared/ui/icon/icon';
import { type IconName } from '@app/shared/ui/icon/icons';
import { cabinetPage } from '../../state/cabinet-pages';

/**
 * A cabinet page: back link to the hub (below lg, where there is no side menu), tinted
 * icon, title, optional badge and header actions (`[actions]`), then the content card.
 */
@Component({
  selector: 'app-cabinet-section',
  imports: [Icon, RouterLink],
  template: `
    <section class="section" [attr.aria-labelledby]="sectionId() + '-title'">
      <header class="section__head">
        <a class="section__back" routerLink=".." aria-label="Назад в кабинет">
          <app-icon name="arrow-left" [size]="20" />
        </a>
        <span class="section__icon" [class]="'tint--' + tint()" aria-hidden="true">
          <app-icon [name]="iconName()" [size]="22" />
        </span>
        <h2 class="section__title" [id]="sectionId() + '-title'">{{ title() }}</h2>
        @if (badge()) {
          <span class="tag tag--muted">{{ badge() }}</span>
        }
        <div class="section__actions"><ng-content select="[actions]" /></div>
      </header>
      <div class="section__body card">
        <ng-content />
      </div>
    </section>
  `,
  styleUrl: './cabinet-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabinetSection {
  readonly sectionId = input.required<string>();
  readonly title = input.required<string>();
  /** Defaults to the cabinet page icon of the section. */
  readonly icon = input<IconName | null>(null);
  /** Short summary next to the title (e.g. «3 из 9»). */
  readonly badge = input<string | null>(null);

  protected readonly tint = computed(() => cabinetPage(this.sectionId()).tint);
  protected readonly iconName = computed(() => this.icon() ?? cabinetPage(this.sectionId()).icon);
}
