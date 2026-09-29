import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SERVICE_CATALOG, categoryOf } from '@app/core/data/catalog';
import { type Master, type MasterService, type Price } from '@app/core/data/models';
import { marketPriceRange } from '@app/core/data/rules';
import { PricePipe } from '@app/shared/format/price';
import { Sheet } from '@app/shared/ui/sheet/sheet';

type PriceKind = Price['kind'];

export const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15); // 15…240
export type ServiceDraft = Omit<MasterService, 'id'> & { id?: string };

/** ТЗ 4.2 add / edit a service: catalog category → subcategory, price kind, duration. */
@Component({
  selector: 'app-service-sheet',
  imports: [FormsModule, Sheet, PricePipe],
  templateUrl: './service-sheet.html',
  styleUrl: './service-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceSheet {
  readonly open = model(false);
  /** Service being edited, or null to add a new one. */
  readonly service = input<MasterService | null>(null);
  readonly existing = input<readonly MasterService[]>([]);
  readonly allMasters = input<readonly Master[]>([]);
  readonly saving = input(false);
  readonly save = output<ServiceDraft>();

  protected readonly catalog = SERVICE_CATALOG;
  protected readonly durations = DURATIONS;

  /** Re-opening the sheet resets the draft to the edited service (or blank). */
  private readonly draft = computed(() => (this.open() ? this.service() : null), {
    equal: () => false,
  });

  protected readonly categoryId = linkedSignal(() => {
    const s = this.draft();
    return (s && categoryOf(s.subcategoryId)?.id) || SERVICE_CATALOG[0]!.id;
  });
  /** Catalog subcategories still available (edited one stays selectable). */
  protected readonly subcategories = computed(() => {
    const taken = new Set(this.existing().map((s) => s.subcategoryId));
    const own = this.service()?.subcategoryId;
    const category = SERVICE_CATALOG.find((c) => c.id === this.categoryId());
    return (category?.subcategories ?? []).filter((s) => s.id === own || !taken.has(s.id));
  });
  protected readonly subcategoryId = linkedSignal(
    () => this.draft()?.subcategoryId ?? this.subcategories()[0]?.id ?? '',
  );
  protected readonly kind = linkedSignal<PriceKind>(() => this.draft()?.price.kind ?? 'exact');
  protected readonly amount = linkedSignal<number | null>(() => {
    const price = this.draft()?.price;
    return price && price.kind !== 'free' ? price.amount : null;
  });
  protected readonly duration = linkedSignal(() => this.draft()?.durationMin ?? 60);

  protected readonly market = computed(() =>
    this.subcategoryId() ? marketPriceRange(this.allMasters(), this.subcategoryId()) : null,
  );

  protected readonly amountError = computed(() => {
    if (this.kind() === 'free') return null;
    const amount = this.amount();
    return amount === null || !(amount > 0) ? 'Укажите стоимость в BYN' : null;
  });

  protected readonly canSave = computed(() => !!this.subcategoryId() && !this.amountError());

  protected submit(): void {
    if (!this.canSave()) return;
    const kind = this.kind();
    const price: Price = kind === 'free' ? { kind } : { kind, amount: Number(this.amount()) };
    this.save.emit({
      id: this.service()?.id,
      subcategoryId: this.subcategoryId(),
      price,
      durationMin: Number(this.duration()),
    });
  }
}
