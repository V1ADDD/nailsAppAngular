import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';
import { type IconName } from '@app/shared/ui/icon/icons';

/** White rounded card with a titled header; the building block of the profile page. */
@Component({
  selector: 'app-profile-section',
  imports: [Icon],
  template: `
    <section class="card section" [attr.aria-labelledby]="headingId">
      <header class="section__header">
        @if (icon(); as name) {
          <span class="section__icon"><app-icon [name]="name" [size]="18" /></span>
        }
        <h2 class="section__title" [id]="headingId">{{ heading() }}</h2>
        @if (meta()) {
          <span class="section__meta">{{ meta() }}</span>
        }
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    @use 'styles/breakpoints' as bp;
    :host {
      display: block;
    }
    .section {
      display: grid;
      gap: var(--space-4);
      padding: var(--space-5) var(--space-4);
    }
    .section__header {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .section__icon {
      display: inline-grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      color: var(--color-primary);
      background: var(--color-primary-soft);
      border-radius: var(--radius-sm);
    }
    .section__title {
      flex: 1;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-bold);
      line-height: var(--line-height-tight);
    }
    .section__meta {
      font-size: var(--font-size-sm);
      color: var(--color-text-secondary);
    }
    @include bp.up(md) {
      .section {
        padding: var(--space-6);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSection {
  private static nextId = 0;
  protected readonly headingId = `profile-section-${ProfileSection.nextId++}`;

  readonly heading = input.required<string>();
  readonly icon = input<IconName | null>(null);
  readonly meta = input<string | null>(null);
}
