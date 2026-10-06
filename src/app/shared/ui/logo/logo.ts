import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark';

let nextLogoId = 0;

/**
 * Brand logo: a location pin holding a polished nail («маникюр рядом»), optionally with the
 * «Мастера рядом» wordmark. The SVG is decorative; the host carries the accessible name.
 */
@Component({
  selector: 'app-logo',
  template: `
    <svg
      class="logo__mark"
      viewBox="0 0 32 32"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          [attr.id]="gradientId"
          x1="4"
          y1="2"
          x2="28"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#b57dff" />
          <stop offset="1" stop-color="#6a1fe0" />
        </linearGradient>
      </defs>
      <path
        [attr.fill]="'url(#' + gradientId + ')'"
        d="M16 30.5C16 30.5 4.5 20 4.5 12.5a11.5 11.5 0 0 1 23 0C27.5 20 16 30.5 16 30.5Z"
      />
      <path
        fill="#fff"
        d="M11.8 18.2v-6.7a4.2 4.2 0 0 1 8.4 0v6.7a1.3 1.3 0 0 1-1.3 1.3h-5.8a1.3 1.3 0 0 1-1.3-1.3Z"
      />
      <path
        fill="none"
        stroke="#9a5cff"
        stroke-width="1.4"
        stroke-linecap="round"
        d="M14.3 16.6v-4.4"
      />
    </svg>
    @if (variant() === 'full') {
      <span class="logo__word" aria-hidden="true">Мастера рядом</span>
    }
  `,
  styleUrl: './logo.scss',
  host: {
    role: 'img',
    'aria-label': 'Мастера рядом',
    '[style.--logo-size]': 'size()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  /** `mark` is the pin only, `full` adds the wordmark. */
  readonly variant = input<LogoVariant>('full');
  /** Mark height/width in px; the wordmark scales with it. */
  readonly size = input(32);

  protected readonly gradientId = `logo-grad-${nextLogoId++}`;
}
