import { Injectable, signal } from '@angular/core';

/** Opens the «Напишите нам» support sheet (ТЗ 11.1) from anywhere in the app. */
@Injectable({ providedIn: 'root' })
export class SupportService {
  readonly isOpen = signal(false);

  open(): void {
    this.isOpen.set(true);
  }
}
