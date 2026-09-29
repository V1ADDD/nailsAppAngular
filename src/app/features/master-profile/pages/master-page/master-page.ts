import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { type CreateBookingResult } from '@app/core/data/api';
import { distanceKm, formatDistance } from '@app/core/data/rules';
import { SessionStore } from '@app/core/session/session.store';
import { PricePipe } from '@app/shared/format/price';
import { Icon } from '@app/shared/ui/icon/icon';
import { ToastService } from '@app/shared/ui/toast/toast.service';
import { MasterProfileStore } from '../../state/master-profile.store';
import { BookingSheet } from '../../ui/booking-sheet/booking-sheet';
import { ContactsCard } from '../../ui/contacts-card/contacts-card';
import { FreeSlots } from '../../ui/free-slots/free-slots';
import { PortfolioGallery } from '../../ui/portfolio-gallery/portfolio-gallery';
import { ProfileAbout } from '../../ui/profile-about/profile-about';
import { ProfileHero } from '../../ui/profile-hero/profile-hero';
import { ProfileSkeleton } from '../../ui/profile-skeleton/profile-skeleton';
import { ReviewList } from '../../ui/review-list/review-list';
import { ServiceList } from '../../ui/service-list/service-list';

/** ТЗ 5.5: the public master profile with booking (ТЗ 6.2, 6.3, 6.10). */
@Component({
  selector: 'app-master-page',
  imports: [
    BookingSheet,
    ContactsCard,
    FreeSlots,
    Icon,
    PortfolioGallery,
    PricePipe,
    ProfileAbout,
    ProfileHero,
    ProfileSkeleton,
    ReviewList,
    RouterLink,
    ServiceList,
  ],
  providers: [MasterProfileStore],
  templateUrl: './master-page.html',
  styleUrl: './master-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MasterPage {
  /** Route param `:id`. */
  readonly id = input.required<string>();
  /** Query `?book=1` opens the booking sheet. */
  readonly book = input<string>();
  /** Query `&service=<subcategoryId>` preselects a service. */
  readonly service = input<string>();

  protected readonly store = inject(MasterProfileStore);
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(ToastService);
  private readonly title = inject(Title);

  /** Whether the user arrived here from another in-app page (so «Назад» stays in the app). */
  private readonly hasHistory = !!this.router.currentNavigation()?.previousNavigation;

  protected readonly own = computed(() => this.session.master()?.id === this.id());
  protected readonly favorite = computed(() => this.session.favoriteIds().has(this.id()));
  protected readonly distance = computed(() => {
    const m = this.store.master();
    return m ? formatDistance(distanceKm(this.session.location(), m.location)) : null;
  });

  constructor() {
    this.store.load(this.id);

    effect(() => {
      const name = this.store.master()?.name;
      if (name) this.title.setTitle(`${name} — запись онлайн`);
    });

    // `?book=1[&service=…]` from other screens: open the booking sheet once the master is here.
    effect(() => {
      const master = this.store.master();
      if (this.book() !== '1' || !master || master.id !== this.id()) return;
      // Signed in: wait for the account so «own profile» is known before opening.
      if (!this.session.isGuest() && !this.session.snapshot()) return;
      const service = this.service() ?? null;
      untracked(() => {
        // Strip the params first so Back from /login can't re-trigger the redirect.
        void this.router.navigate([], {
          queryParams: { book: null, service: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        this.startBooking(service);
      });
    });
  }

  protected back(): void {
    if (this.hasHistory) this.location.back();
    else void this.router.navigateByUrl('/');
  }

  protected startBooking(subcategoryId: string | null = null, slotId: string | null = null): void {
    if (this.own()) return;
    if (this.session.isGuest()) {
      this.toLogin(true, subcategoryId);
      return;
    }
    this.store.openBooking({ clientId: this.session.client()?.id ?? null, subcategoryId, slotId });
  }

  protected confirmBooking(): void {
    if (!this.store.canSubmit()) return;
    this.store.book({
      clientId: this.session.client()?.id,
      onSuccess: (result) => this.onBooked(result),
    });
  }

  protected message(): void {
    const client = this.session.client();
    if (this.session.isGuest() || !client) {
      this.toLogin(false);
      return;
    }
    this.store.openChat({
      clientId: client.id,
      onSuccess: (chatId) => this.openChat(chatId),
      onError: (text) => this.toast.error(text),
    });
  }

  protected toggleFavorite(): void {
    if (this.session.isGuest()) {
      this.toLogin(false);
      return;
    }
    this.session.toggleFavorite(this.id());
  }

  private onBooked(result: CreateBookingResult): void {
    this.toast.success('Запись создана — ждём подтверждения мастера');
    for (const old of result.autoCancelled) {
      this.toast.show(`Запись к ${old.masterName} на это же время отменена автоматически`);
    }
    this.openChat(result.chatId);
  }

  private openChat(chatId: string): void {
    // The booking/chat belongs to the client side (ТЗ 2.2: chats are separate per role).
    if (this.session.activeRole() === 'master') this.session.setRole('client');
    void this.router.navigate(['/chats', chatId]);
  }

  private toLogin(book: boolean, subcategoryId: string | null = null): void {
    let redirect = `/masters/${this.id()}`;
    if (book) redirect += `?book=1${subcategoryId ? `&service=${subcategoryId}` : ''}`;
    void this.router.navigate(['/login'], { queryParams: { redirect } });
  }
}
