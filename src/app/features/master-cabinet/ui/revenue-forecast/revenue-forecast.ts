import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type ExpectedLine } from '@app/core/data/api';
import { formatAmount } from '@app/shared/format/price';

/**
 * How the expected revenue is made up: per service, upcoming bookings × its price in the
 * cabinet, then the sum («3 × 30 р + 5 × 50 р = 340 р»).
 */
@Component({
  selector: 'app-revenue-forecast',
  template: `
    <section class="forecast" aria-labelledby="forecast-title">
      <h3 class="forecast__title" id="forecast-title">Прогноз по услугам</h3>
      @if (lines().length) {
        <ul class="forecast__list">
          @for (line of rows(); track line.subcategoryId) {
            <li class="forecast__line">
              <span class="forecast__name">{{ line.serviceName }}</span>
              <span class="forecast__calc">{{ line.calc }}</span>
              <strong class="forecast__total">{{ line.totalText }}</strong>
              <span class="forecast__bar" aria-hidden="true">
                <span [style.width.%]="line.share"></span>
              </span>
            </li>
          }
        </ul>
        <p class="forecast__sum">
          <span>Итого ожидается</span>
          <strong>{{ totalText() }}</strong>
        </p>
      } @else {
        <p class="forecast__empty">Предстоящих записей за период нет.</p>
      }
    </section>
  `,
  styleUrl: './revenue-forecast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevenueForecast {
  readonly lines = input.required<readonly ExpectedLine[]>();
  readonly total = input.required<number>();

  protected readonly rows = computed(() => {
    const max = Math.max(1, ...this.lines().map((l) => l.total));
    return this.lines().map((line) => ({
      ...line,
      calc: `${line.count} × ${formatAmount(line.price)}`,
      totalText: formatAmount(line.total),
      share: (line.total / max) * 100,
    }));
  });
  protected readonly totalText = computed(() => formatAmount(this.total()));
}
