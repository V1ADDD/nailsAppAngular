import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

export type AvatarShape = 'circle' | 'rounded';

/** Photo avatar with an initials fallback when there is no photo or it fails to load. */
@Component({
  selector: 'app-avatar',
  template: `
    <span
      class="avatar"
      [class.avatar--rounded]="shape() === 'rounded'"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="size() * 0.36"
    >
      @if (showPhoto()) {
        <img [src]="src()" [alt]="name()" (error)="failed.set(true)" loading="lazy" />
      } @else {
        <span class="avatar__initials" role="img" [attr.aria-label]="name()">{{ initials() }}</span>
      }
      @if (online()) {
        <span class="avatar__online" aria-hidden="true"></span>
      }
      @if (badge()) {
        <span class="avatar__badge" [attr.title]="badgeLabel()">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
            <path
              d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2 2 0 0 0 1.6 1.2l5.2.7a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.5l-4.6-2.4a2 2 0 0 0-2 0L5.5 21a.5.5 0 0 1-.8-.5l.9-5.2a2 2 0 0 0-.6-1.8L1.2 9.8a.5.5 0 0 1 .3-.9l5.2-.7A2 2 0 0 0 8.3 7z"
            />
          </svg>
          <span class="visually-hidden">{{ badgeLabel() }}</span>
        </span>
      }
    </span>
  `,
  styleUrl: './avatar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input.required<string>();
  readonly src = input<string | null | undefined>(null);
  readonly size = input(56);
  readonly shape = input<AvatarShape>('circle');
  readonly online = input(false);
  /** Small violet star badge used in the design to mark masters. */
  readonly badge = input(false);
  readonly badgeLabel = input('Мастер');

  protected readonly failed = linkedSignal({ source: this.src, computation: () => false });
  protected readonly showPhoto = computed(() => !!this.src() && !this.failed());
  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join(''),
  );
}
