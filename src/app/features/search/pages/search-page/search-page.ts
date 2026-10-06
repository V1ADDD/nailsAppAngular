import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  computed,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, fromEvent, map, of } from 'rxjs';
import { findCategory, findSubcategory } from '@app/core/data/catalog';
import { SessionStore } from '@app/core/session/session.store';
import { SupportService } from '@app/core/support/support.service';
import { formatPrice } from '@app/shared/format/price';
import { Icon } from '@app/shared/ui/icon/icon';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import {
  EMPTY_FILTERS,
  type SearchFilters,
  type ServiceSuggestion,
  needsSlots,
  serviceSuggestions,
} from '../../state/search-logic';
import { SearchStore } from '../../state/search.store';
import { type FilterSection, FilterChips } from '../../ui/filter-chips/filter-chips';
import { FiltersSheet } from '../../ui/filters-sheet/filters-sheet';
import { ListHeader, type SheetDragEnd } from '../../ui/list-header/list-header';
import {
  type SheetHeights,
  type SheetSnap,
  clampSheetHeight,
  resolveSnap,
  sheetHeights,
  toggleSnap,
} from '../../ui/list-header/sheet-snap';
import { MasterMiniCard } from '../../ui/master-mini-card/master-mini-card';
import { type BookRequest, MasterList } from '../../ui/master-list/master-list';
import { SearchBar } from '../../ui/search-bar/search-bar';
import { type MapPin, SearchMap } from '../../ui/search-map/search-map';

function mediaQuery(query: string) {
  const mq = typeof window !== 'undefined' ? window.matchMedia?.(query) : undefined;
  return toSignal(
    mq ? fromEvent<MediaQueryListEvent>(mq, 'change').pipe(map((e) => e.matches)) : of(false),
    {
      initialValue: mq?.matches ?? false,
    },
  );
}

/** ТЗ 5: the map home — search, filters, sort, map with price pins and the result list. */
@Component({
  selector: 'app-search-page',
  imports: [
    RouterLink,
    Icon,
    SearchBar,
    FilterChips,
    SearchMap,
    ListHeader,
    MasterList,
    MasterMiniCard,
    FiltersSheet,
  ],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage implements OnInit {
  protected readonly store = inject(SearchStore);
  protected readonly session = inject(SessionStore);
  protected readonly support = inject(SupportService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Query params (`withComponentInputBinding`), so back navigation restores the search. */
  readonly q = input<string>();
  readonly service = input<string>();

  protected readonly isMd = mediaQuery('(min-width: 768px)');
  /** Mobile results sheet: collapsed (default) / half / full. Ignored from md (side panel). */
  protected readonly snap = signal<SheetSnap>('collapsed');
  /** Live sheet height (px) while the handle is being dragged, otherwise null. */
  protected readonly dragHeight = signal<number | null>(null);
  protected readonly listClosed = computed(() => !this.isMd() && this.snap() === 'collapsed');
  protected readonly selected = computed(
    () => this.store.results().find((r) => r.master.id === this.store.selectedId()) ?? null,
  );
  /** Tapped pin on a phone: its mini card floats above the collapsed sheet. */
  protected readonly showCard = computed(() => this.listClosed() && this.selected() !== null);

  private readonly mapEl = viewChild.required('map', { read: ElementRef<HTMLElement> });
  private readonly panelEl = viewChild.required('panel', { read: ElementRef<HTMLElement> });
  private readonly peekEl = viewChild.required('peek', { read: ElementRef<HTMLElement> });
  private dragStartHeight = 0;
  private heights: SheetHeights | null = null;

  protected readonly text = signal('');
  protected readonly suggestions = computed(() => serviceSuggestions(this.text()));

  protected readonly pins = computed<MapPin[]>(() =>
    this.store.results().map((r) => ({
      id: r.master.id,
      name: r.master.name,
      lat: r.master.location.lat,
      lng: r.master.location.lng,
      label: r.minPrice ? formatPrice(r.minPrice, { short: true }) : r.master.specialty,
      online: r.master.online,
    })),
  );

  protected readonly sheetOpen = signal(false);
  protected readonly sheetSection = signal<FilterSection>('all');
  protected readonly draft = signal<SearchFilters>(EMPTY_FILTERS);
  protected readonly previewCount = computed(() => this.store.countFor(this.draft()));

  private readonly urlReady = signal(false);

  constructor() {
    // Mirror the query and service filter into the URL (replaceUrl: no history spam).
    effect(() => {
      if (!this.urlReady()) return;
      const q = this.store.query().trim();
      const { categoryId, subcategoryId } = this.store.filters();
      untracked(() =>
        this.router.navigate([], {
          queryParams: { q: q || null, service: subcategoryId ?? categoryId ?? null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });
  }

  ngOnInit(): void {
    this.store.setLocation(this.session.location());
    this.store.load();

    const q = this.q() ?? this.store.query();
    this.text.set(q);
    this.store.setQuery(q);
    const service = this.service();
    if (service) {
      const sub = findSubcategory(service);
      if (sub) this.store.patchFilters({ categoryId: sub.categoryId, subcategoryId: sub.id });
      else if (findCategory(service)) {
        this.store.patchFilters({ categoryId: service, subcategoryId: null });
      }
    }
    this.urlReady.set(true);
  }

  protected onText(value: string): void {
    this.text.set(value);
    this.store.setQueryDebounced(value);
  }

  protected pick(s: ServiceSuggestion): void {
    const sub = s.kind === 'subcategory' ? findSubcategory(s.id) : undefined;
    this.store.patchFilters(
      sub
        ? { categoryId: sub.categoryId, subcategoryId: sub.id }
        : { categoryId: s.id, subcategoryId: null },
    );
    this.text.set('');
    this.store.setQuery('');
    this.store.setQueryDebounced('');
  }

  protected openFilters(section: FilterSection): void {
    this.draft.set(this.store.filters());
    this.sheetSection.set(section);
    this.sheetOpen.set(true);
  }

  protected onDraft(filters: SearchFilters): void {
    this.draft.set(filters);
    if (needsSlots(filters, this.store.sort())) this.store.ensureSlots(filters);
  }

  protected applyFilters(): void {
    this.store.setFilters(this.draft());
    this.sheetOpen.set(false);
  }

  protected toggle(field: 'onlineOnly' | 'verifiedOnly'): void {
    this.store.patchFilters({ [field]: !this.store.filters()[field] });
  }

  protected reset(): void {
    this.text.set('');
    this.store.setQueryDebounced('');
    this.store.resetFilters();
  }

  protected selectPin(id: string): void {
    this.store.select(id);
    // On a phone show the master as a mini card above the collapsed sheet, not under it.
    if (!this.isMd()) this.snap.set('collapsed');
  }

  protected toggleSheet(): void {
    this.snap.set(toggleSnap(this.snap()));
  }

  protected onDragStart(): void {
    const available = this.mapEl().nativeElement.clientHeight;
    this.heights = sheetHeights(available, this.peekEl().nativeElement.offsetHeight);
    this.dragStartHeight = this.panelEl().nativeElement.offsetHeight;
    this.dragHeight.set(this.dragStartHeight);
  }

  protected onDragMove(dy: number): void {
    if (!this.heights) return;
    this.dragHeight.set(clampSheetHeight(this.dragStartHeight - dy, this.heights));
  }

  protected onDragEnd({ velocity }: SheetDragEnd): void {
    const heights = this.heights;
    const height = this.dragHeight();
    this.heights = null;
    this.dragHeight.set(null);
    // Dragging up grows the sheet, so the (downward) release velocity is inverted.
    if (heights && height !== null) this.snap.set(resolveSnap(height, -velocity, heights));
  }

  protected book({ masterId, subcategoryId }: BookRequest): void {
    const queryParams = subcategoryId ? { book: 1, service: subcategoryId } : { book: 1 };
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/masters', masterId], { queryParams }),
    );
    if (this.session.isGuest()) this.toLogin(url);
    else void this.router.navigateByUrl(url);
  }

  protected async message(masterId: string): Promise<void> {
    const client = this.session.client();
    if (this.session.isGuest() || !client) {
      this.toLogin(this.router.url);
      return;
    }
    try {
      const chat = await firstValueFrom(this.store.chatWith(masterId, client.id));
      // Chats are per role (ТЗ 2.2): messaging a master is a client-side chat.
      this.session.setRole('client');
      await this.router.navigate(['/chats', chat.id]);
    } catch {
      this.toast.error('Не удалось открыть чат. Попробуйте ещё раз.');
    }
  }

  protected favorite(masterId: string): void {
    if (this.session.isGuest()) this.toLogin(this.router.url);
    else this.session.toggleFavorite(masterId);
  }

  private toLogin(redirect: string): void {
    void this.router.navigate(['/login'], { queryParams: { redirect } });
  }
}
