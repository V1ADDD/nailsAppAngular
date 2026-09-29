import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatAmount } from '@app/shared/format/price';

/** ТЗ 7.3 «кольцо выручки»: earned (completed) vs expected (upcoming), total in the center. */
@Component({
  selector: 'app-revenue-donut',
  template: `
    <figure class="donut">
      <svg viewBox="0 0 42 42" class="donut__chart" role="img" [attr.aria-label]="ariaLabel()">
        <circle class="donut__track" cx="21" cy="21" r="15.915" />
        @if (earnedPct()) {
          <circle
            class="donut__earned"
            cx="21"
            cy="21"
            r="15.915"
            [attr.stroke-dasharray]="earnedPct() + ' ' + (100 - earnedPct())"
            stroke-dashoffset="25"
          />
        }
        @if (expectedPct()) {
          <circle
            class="donut__expected"
            cx="21"
            cy="21"
            r="15.915"
            [attr.stroke-dasharray]="expectedPct() + ' ' + (100 - expectedPct())"
            [attr.stroke-dashoffset]="25 - earnedPct()"
          />
        }
      </svg>
      <div class="donut__center" aria-hidden="true">
        <strong>≈ {{ earnedText() }}</strong>
        <span>выручка</span>
      </div>
      <figcaption class="donut__legend">
        <span><span class="swatch swatch--earned"></span>Заработано {{ earnedText() }}</span>
        <span><span class="swatch swatch--expected"></span>Ожидается {{ expectedText() }}</span>
      </figcaption>
    </figure>
  `,
  styleUrl: './revenue-donut.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueDonut {
  readonly revenue = input.required<number>();
  readonly expected = input.required<number>();

  private readonly total = computed(() => this.revenue() + this.expected());
  protected readonly earnedPct = computed(() =>
    this.total() ? (this.revenue() / this.total()) * 100 : 0,
  );
  protected readonly expectedPct = computed(() =>
    this.total() ? (this.expected() / this.total()) * 100 : 0,
  );
  protected readonly earnedText = computed(() => formatAmount(Math.round(this.revenue())));
  protected readonly expectedText = computed(() => formatAmount(Math.round(this.expected())));
  protected readonly ariaLabel = computed(
    () => `Выручка примерно ${this.earnedText()}, ожидается ещё ${this.expectedText()}`,
  );
}
