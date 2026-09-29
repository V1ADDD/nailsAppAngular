import { type Price } from '@app/shared/format/price';

export type { Price };

/** ISO-8601 timestamp string. */
export type IsoDate = string;

export interface LatLng {
  lat: number;
  lng: number;
}

// ── Service catalog (ТЗ 4.2: two levels, category → subcategory) ──────────────

export interface ServiceSubcategory {
  id: string;
  categoryId: string;
  name: string;
  /** Extra words the search should match («шеллак» → покрытие гель-лаком). */
  synonyms?: readonly string[];
  /**
   * Add-on booked together with a main service (removal, nail art). Never used as the
   * headline «от» price: ТЗ 1.2 calls the Kufar «cheapest item» price misleading.
   */
  addon?: boolean;
}

export interface ServiceCategory {
  id: string;
  name: string;
  /** Specialty title for masters of this category («Мастер ногтей»). */
  specialty: string;
  synonyms?: readonly string[];
  subcategories: readonly ServiceSubcategory[];
}

// ── Master (ТЗ 4.1, 4.3, 4.4, 2.3) ────────────────────────────────────────────

export interface MasterService {
  id: string;
  subcategoryId: string;
  price: Price;
  durationMin: number;
}

export interface PortfolioPhoto {
  id: string;
  /** Uploaded photo (object URL in the mock) or null for a placeholder tile. */
  url: string | null;
  /** Placeholder gradient hue for mock photos without a real image. */
  hue: number;
  caption?: string;
}

export interface Course {
  title: string;
  school: string;
  year: number;
}

export interface Contacts {
  phone: string;
  email: string;
  telegram?: string;
  viber?: string;
  instagram?: string;
}

export type PreferredContact = 'messages' | 'phone';

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface ScheduleTemplate {
  /** ISO weekday numbers, 1 = Monday … 7 = Sunday. */
  workDays: readonly number[];
  /** Working hours, 'HH:mm'. */
  from: string;
  to: string;
  slotMinutes: number;
}

export interface AutoConfirm {
  enabled: boolean;
  /** Auto-confirm pending bookings after this many minutes. */
  afterMinutes: number;
}

export interface Master {
  id: string;
  /** Salon the master works for (ТЗ 2.3, stage 2). Always null in the MVP. */
  organizationId: string | null;
  name: string;
  photoUrl: string | null;
  categoryIds: readonly string[];
  /** Main specialty title, shown under the name. */
  specialty: string;
  city: string;
  district: string;
  address: string;
  location: LatLng;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  verification: VerificationStatus;
  online: boolean;
  /** Typical reply time in minutes (ТЗ 1.2: «как быстро отвечает»). */
  replyMinutes: number;
  about: string;
  courses: readonly Course[];
  contacts: Contacts;
  services: readonly MasterService[];
  portfolio: readonly PortfolioPhoto[];
  /** Completed bookings, used for «популярность» sorting. */
  bookingsCount: number;
  schedule: ScheduleTemplate;
  autoConfirm: AutoConfirm;
}

// ── Clients & account (ТЗ 2.2, 7.2, 7.6) ──────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  photoUrl: string | null;
  phone: string;
  email: string;
  telegram?: string;
  viber?: string;
  preferredContact: PreferredContact;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  site: boolean;
  /** ТЗ 6.7: reminders 24 h and 2 h before a booking. */
  reminders: boolean;
}

export type Role = 'client' | 'master';

export interface Account {
  id: string;
  clientId: string;
  /** Present when the user has a master profile (one account, two roles). */
  masterId: string | null;
  notifications: NotificationSettings;
  favoriteMasterIds: readonly string[];
}

// ── Slots & bookings (ТЗ 6) ───────────────────────────────────────────────────

/**
 * ТЗ 6.2. Master view: free / booked (booking from the site) / busy (external, «не с сайта");
 * both sides see pending. Clients only see free / busy / pending.
 */
export type SlotStatus = 'free' | 'pending' | 'booked' | 'busy';
export type ClientSlotStatus = 'free' | 'pending' | 'busy';

export interface Slot {
  id: string;
  masterId: string;
  start: IsoDate;
  durationMin: number;
  status: SlotStatus;
  bookingId: string | null;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';

export interface Cancellation {
  by: Role;
  reason: string;
  /** Mutual cancellation has no consequences (ТЗ 6.5). */
  mutual: boolean;
  at: IsoDate;
  /** ТЗ 6.4: released automatically because nobody confirmed in time; can be restored via chat. */
  expired?: boolean;
}

export interface Booking {
  id: string;
  masterId: string;
  /** Null for external bookings without a site client. */
  clientId: string | null;
  /** Display name for external clients («не с сайта»). */
  externalClientName?: string;
  subcategoryId: string;
  price: Price;
  start: IsoDate;
  durationMin: number;
  address: string;
  status: BookingStatus;
  source: 'site' | 'external';
  createdBy: Role;
  createdAt: IsoDate;
  confirmedAt?: IsoDate;
  cancellation?: Cancellation;
  /** Master's private notes (ТЗ 6.8). */
  note?: string;
  slotId: string | null;
  chatId: string | null;
}

// ── Chats (ТЗ 8) ──────────────────────────────────────────────────────────────

export type MessageKind = 'text' | 'booking' | 'system';

export interface Message {
  id: string;
  chatId: string;
  kind: MessageKind;
  /** Which side of the chat wrote it; system messages have no author. */
  author: Role | null;
  text?: string;
  imageUrl?: string;
  bookingId?: string;
  sentAt: IsoDate;
  editedAt?: IsoDate;
  deleted?: boolean;
}

/** One chat per master ↔ client pair (ТЗ 8.2). */
export interface Chat {
  id: string;
  masterId: string;
  clientId: string;
  /** Last time each side read the chat, for unread counters. */
  readAt: Record<Role, IsoDate>;
  blockedBy: Role | null;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  masterId: string;
  clientId: string;
  /** Who wrote it: a client about a master, or a master about a client. */
  author: Role;
  subcategoryId: string;
  rating: number;
  text: string;
  date: IsoDate;
}
