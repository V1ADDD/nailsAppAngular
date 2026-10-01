import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PORTFOLIO_LIMIT } from '@app/core/data/api';
import { CabinetStore } from '../../state/cabinet.store';
import { CabinetSection } from '../../ui/cabinet-section/cabinet-section';
import { PortfolioGrid } from '../../ui/portfolio-grid/portfolio-grid';
import { injectCabinetFeedback } from './cabinet-feedback';

/** 5. «Портфолио» (ТЗ 4.3). */
@Component({
  selector: 'app-portfolio-section',
  imports: [CabinetSection, PortfolioGrid],
  template: `
    <app-cabinet-section sectionId="portfolio" title="Портфолио" icon="image" [badge]="badge()">
      @if (store.master(); as master) {
        <app-portfolio-grid
          [photos]="master.portfolio"
          [limit]="limit"
          [busy]="store.saving()"
          (add)="add($event)"
          (remove)="remove($event)"
          (rejected)="feedback.toast.error($event)"
        />
      }
    </app-cabinet-section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioSection {
  protected readonly store = inject(CabinetStore);
  protected readonly feedback = injectCabinetFeedback();
  protected readonly limit = PORTFOLIO_LIMIT;

  protected readonly badge = computed(
    () => `${this.store.master()?.portfolio.length ?? 0} из ${PORTFOLIO_LIMIT}`,
  );

  protected add(files: File[]): void {
    // Mock upload: object URLs stand in for uploaded photos.
    const photos = files.map((file) => ({ url: URL.createObjectURL(file), hue: 0 }));
    const text = files.length > 1 ? `Добавлено фото: ${files.length}` : 'Фото добавлено';
    this.store.addPortfolio(photos, this.feedback.master(text));
  }

  protected remove(ids: string[]): void {
    const text = ids.length > 1 ? `Удалено фото: ${ids.length}` : 'Фото удалено';
    this.store.removePortfolio(ids, this.feedback.master(text));
  }
}
