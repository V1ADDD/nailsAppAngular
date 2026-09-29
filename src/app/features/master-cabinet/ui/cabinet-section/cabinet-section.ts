import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';
import { type IconName } from '@app/shared/ui/icon/icons';

/** Accordion card of the cabinet: icon + title + chevron, collapsible body. */
@Component({
  selector: 'app-cabinet-section',
  imports: [Icon],
  template: `
    <section class="section card" [attr.aria-labelledby]="sectionId() + '-title'">
      <h2 class="section__heading" [id]="sectionId() + '-title'">
        <button
          type="button"
          class="section__toggle"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="sectionId() + '-body'"
          (click)="toggled.emit()"
        >
          <span class="section__icon" aria-hidden="true"
            ><app-icon [name]="icon()" [size]="20"
          /></span>
          <span class="section__title">{{ title() }}</span>
          @if (badge()) {
            <span class="tag tag--muted section__badge">{{ badge() }}</span>
          }
          <app-icon
            class="section__chevron"
            [name]="open() ? 'chevron-up' : 'chevron-down'"
            [size]="20"
          />
        </button>
      </h2>
      <div
        class="section__body"
        role="region"
        [id]="sectionId() + '-body'"
        [attr.aria-labelledby]="sectionId() + '-title'"
        [hidden]="!open()"
      >
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
  readonly icon = input.required<IconName>();
  readonly open = input(false);
  /** Short summary shown in the header (e.g. «3 из 9»). */
  readonly badge = input<string | null>(null);
  readonly toggled = output<void>();
}
