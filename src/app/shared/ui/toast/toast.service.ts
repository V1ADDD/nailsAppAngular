import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

const TOAST_DURATION_MS = 3500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private readonly _messages = signal<ToastMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  show(text: string, kind: ToastKind = 'info'): void {
    const id = this.nextId++;
    this._messages.update((list) => [...list, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), TOAST_DURATION_MS);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  dismiss(id: number): void {
    this._messages.update((list) => list.filter((m) => m.id !== id));
  }
}
