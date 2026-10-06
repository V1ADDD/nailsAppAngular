import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SERVICE_CATALOG } from '@app/core/data/catalog';
import { type Course, type Master } from '@app/core/data/models';
import { type ProfilePatch } from '../../state/cabinet.store';
import { CoursesEditor } from '../courses-editor/courses-editor';

type RequiredField = 'name' | 'phone' | 'email' | 'city' | 'address';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s()-]{7,}$/;

/** ТЗ 4.1 + 6.4: editable master profile. Emits a patch for CabinetApi.updateProfile. */
@Component({
  selector: 'app-profile-form',
  imports: [FormsModule, CoursesEditor],
  templateUrl: './profile-form.html',
  styleUrl: './profile-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileForm {
  readonly master = input.required<Master>();
  readonly saving = input(false);
  readonly save = output<ProfilePatch>();

  protected readonly specialties = [...new Set(SERVICE_CATALOG.map((c) => c.specialty))];

  protected readonly name = linkedSignal(() => this.master().name);
  protected readonly phone = linkedSignal(() => this.master().contacts.phone);
  protected readonly email = linkedSignal(() => this.master().contacts.email);
  protected readonly city = linkedSignal(() => this.master().city);
  protected readonly address = linkedSignal(() => this.master().address);
  protected readonly specialty = linkedSignal(() => this.master().specialty);
  protected readonly experience = linkedSignal<number | null>(() => this.master().experienceYears);
  protected readonly about = linkedSignal(() => this.master().about);
  protected readonly courses = linkedSignal<readonly Course[]>(() => this.master().courses);
  protected readonly telegram = linkedSignal(() => this.master().contacts.telegram ?? '');
  protected readonly viber = linkedSignal(() => this.master().contacts.viber ?? '');
  protected readonly instagram = linkedSignal(() => this.master().contacts.instagram ?? '');
  protected readonly online = linkedSignal(() => this.master().online);

  protected readonly submitted = signal(false);

  protected readonly errors = computed<Partial<Record<RequiredField, string>>>(() => {
    const e: Partial<Record<RequiredField, string>> = {};
    if (!this.name().trim()) e.name = 'Введите имя';
    if (!PHONE.test(this.phone().trim())) e.phone = 'Введите телефон, например +375 29 123-45-67';
    if (!EMAIL.test(this.email().trim())) e.email = 'Введите почту, например anna@mail.by';
    if (!this.city().trim()) e.city = 'Укажите город';
    if (!this.address().trim()) e.address = 'Укажите адрес';
    return e;
  });

  protected error(field: RequiredField): string | null {
    return this.submitted() ? (this.errors()[field] ?? null) : null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (Object.keys(this.errors()).length) return;
    const master = this.master();
    const optional = (value: string) => value.trim() || undefined;
    this.save.emit({
      name: this.name().trim(),
      city: this.city().trim(),
      address: this.address().trim(),
      specialty: this.specialty(),
      experienceYears: Math.max(0, Math.round(this.experience() ?? 0)),
      about: this.about().trim(),
      courses: this.courses(),
      contacts: {
        ...master.contacts,
        phone: this.phone().trim(),
        email: this.email().trim(),
        telegram: optional(this.telegram()),
        viber: optional(this.viber()),
        instagram: optional(this.instagram()),
      },
      online: this.online(),
    });
  }
}
