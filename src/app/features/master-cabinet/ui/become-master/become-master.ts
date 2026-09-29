import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { type BecomeMasterInput } from '@app/core/data/api';
import { SERVICE_CATALOG } from '@app/core/data/catalog';
import { Icon } from '@app/shared/ui/icon/icon';
import { type IconName } from '@app/shared/ui/icon/icons';

const BENEFITS: readonly { icon: IconName; text: string }[] = [
  { icon: 'id-card', text: 'Своя карточка с портфолио, ценами и отзывами' },
  { icon: 'calendar', text: 'График и онлайн-запись без переписок' },
  { icon: 'users', text: 'Список клиентов с заметками и историей визитов' },
  { icon: 'sparkles', text: 'Бесплатно на старте сервиса' },
];

/** ТЗ 2.2 onboarding: turn the client account into a master profile. */
@Component({
  selector: 'app-become-master',
  imports: [FormsModule, Icon],
  templateUrl: './become-master.html',
  styleUrl: './become-master.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BecomeMaster {
  readonly saving = input(false);
  readonly submitted = output<BecomeMasterInput>();

  protected readonly benefits = BENEFITS;
  protected readonly catalog = SERVICE_CATALOG;
  protected readonly categoryId = signal(SERVICE_CATALOG[0]!.id);
  protected readonly city = signal('Минск');
  protected readonly address = signal('');
  protected readonly touched = signal(false);

  protected readonly valid = computed(() => !!this.city().trim() && !!this.address().trim());

  protected submit(): void {
    this.touched.set(true);
    if (!this.valid()) return;
    const category = SERVICE_CATALOG.find((c) => c.id === this.categoryId())!;
    this.submitted.emit({
      specialty: category.specialty,
      categoryIds: [category.id],
      city: this.city().trim(),
      address: this.address().trim(),
    });
  }
}
