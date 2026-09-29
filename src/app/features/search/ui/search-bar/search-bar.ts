import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { Icon } from '@app/shared/ui/icon/icon';
import { type ServiceSuggestion } from '../../state/search-logic';

/** «Мастер, услуга, район...» field with catalog suggestions (ARIA combobox, ТЗ 5.6). */
@Component({
  selector: 'app-search-bar',
  imports: [Icon],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  readonly value = model('');
  readonly suggestions = input<readonly ServiceSuggestion[]>([]);
  readonly pick = output<ServiceSuggestion>();

  protected readonly focused = signal(false);
  protected readonly dismissed = linkedSignal({ source: this.value, computation: () => false });
  protected readonly active = linkedSignal({ source: this.suggestions, computation: () => -1 });
  protected readonly open = computed(
    () => this.focused() && !this.dismissed() && this.suggestions().length > 0,
  );

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.suggestions().length;
    if (event.key === 'Escape') {
      if (this.open()) this.dismissed.set(true);
      else this.value.set('');
      return;
    }
    if (!this.open() || !count) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.active.set((this.active() + step + count) % count);
    } else if (event.key === 'Enter' && this.active() >= 0) {
      event.preventDefault();
      this.choose(this.suggestions()[this.active()]!);
    }
  }

  protected onBlur(): void {
    // Let a click on a suggestion land before the list closes.
    setTimeout(() => this.focused.set(false), 150);
  }

  protected choose(s: ServiceSuggestion): void {
    this.pick.emit(s);
    this.dismissed.set(true);
  }

  protected clear(input: HTMLInputElement): void {
    this.value.set('');
    input.focus();
  }
}
