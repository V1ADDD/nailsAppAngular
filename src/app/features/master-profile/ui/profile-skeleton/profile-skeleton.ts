import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Loading placeholder that mirrors the profile layout. */
@Component({
  selector: 'app-profile-skeleton',
  template: `
    <div class="layout" aria-busy="true" role="status">
      <span class="visually-hidden">Загрузка профиля мастера</span>
      <div class="card side">
        <div class="row">
          <div class="skeleton photo"></div>
          <div class="lines">
            <div class="skeleton line line--lg"></div>
            <div class="skeleton line"></div>
            <div class="skeleton line line--sm"></div>
          </div>
        </div>
        <div class="skeleton line"></div>
        <div class="skeleton line"></div>
        <div class="skeleton button"></div>
      </div>
      <div class="main">
        @for (i of [1, 2]; track i) {
          <div class="card block">
            <div class="skeleton line line--lg"></div>
            <div class="skeleton line"></div>
            <div class="skeleton line"></div>
            <div class="skeleton line line--sm"></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    @use 'styles/breakpoints' as bp;
    .layout {
      display: grid;
      gap: var(--space-4);
      @include bp.up(lg) {
        grid-template-columns: minmax(0, 1fr) 22.5rem;
        align-items: start;
      }
    }
    .side {
      @include bp.up(lg) {
        grid-column: 2;
        grid-row: 1;
      }
    }
    .main {
      display: grid;
      gap: var(--space-4);
    }
    .side,
    .block {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-4);
    }
    .row {
      display: flex;
      gap: var(--space-4);
    }
    .photo {
      flex-shrink: 0;
      width: 6rem;
      height: 6rem;
      border-radius: var(--radius-lg);
    }
    .lines {
      display: grid;
      flex: 1;
      gap: var(--space-2);
      align-content: center;
    }
    .line {
      height: var(--space-4);
      &--lg {
        height: var(--space-6);
        width: 70%;
      }
      &--sm {
        width: 40%;
      }
    }
    .button {
      height: var(--tap-target);
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSkeleton {}
