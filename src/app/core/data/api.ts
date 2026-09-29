// API contracts (DI tokens). Stores depend only on these abstract classes; the mock
// implementations live in ./mock and get swapped for HTTP ones once a backend exists.
import { type Observable } from 'rxjs';
import {
  type Account,
  type Booking,
  type Chat,
  type Client,
  type IsoDate,
  type Master,
  type MasterService,
  type Message,
  type NotificationSettings,
  type PortfolioPhoto,
  type Review,
  type Role,
  type ScheduleTemplate,
  type Slot,
} from './models';

// ── Masters (catalog, map, profile) ───────────────────────────────────────────

export abstract class MastersApi {
  abstract list(): Observable<Master[]>;
  abstract getById(id: string): Observable<Master>;
  /** Upcoming slots of a master; statuses are already masked for `viewer` (ТЗ 6.2). */
  abstract getSlots(masterId: string, viewer: Role): Observable<Slot[]>;
  /** Reviews written by clients about the master. */
  abstract getReviews(masterId: string): Observable<Review[]>;
}

// ── Account (session user, both roles) ────────────────────────────────────────

export interface AccountSnapshot {
  account: Account;
  client: Client;
  master: Master | null;
}

export interface BecomeMasterInput {
  specialty: string;
  categoryIds: string[];
  city: string;
  address: string;
}

export abstract class AccountApi {
  abstract me(): Observable<AccountSnapshot>;
  abstract updateClient(patch: Partial<Omit<Client, 'id'>>): Observable<Client>;
  abstract updateNotifications(patch: Partial<NotificationSettings>): Observable<Account>;
  abstract toggleFavorite(masterId: string): Observable<Account>;
  /** ТЗ 2.2: creates the master profile from the client's basic info. */
  abstract becomeMaster(input: BecomeMasterInput): Observable<AccountSnapshot>;
}

// ── Bookings & schedule (ТЗ 6) ────────────────────────────────────────────────

/** A booking with the display data of both sides resolved. */
export interface BookingView extends Booking {
  masterName: string;
  masterPhotoUrl: string | null;
  clientName: string;
  clientPhotoUrl: string | null;
  serviceName: string;
  /** ТЗ 6.4: when a pending booking releases its slot unless confirmed. */
  releaseAt: IsoDate | null;
}

export interface CreateBookingInput {
  masterId: string;
  clientId: string;
  slotId: string;
  subcategoryId: string;
  /** ТЗ 6.3: a client books, or a master books «через сайт» for a client. */
  createdBy: Role;
}

export interface CreateBookingResult {
  booking: BookingView;
  chatId: string;
  /** ТЗ 6.10: the client's bookings that were cancelled because they overlap. */
  autoCancelled: BookingView[];
  /** ТЗ 6.10: same-day bookings that are too close; show a warning. */
  tooClose: BookingView[];
}

export interface ExternalBookingInput {
  masterId: string;
  start: IsoDate;
  subcategoryId: string;
  clientName: string;
  note?: string;
}

export abstract class BookingsApi {
  abstract forClient(clientId: string): Observable<BookingView[]>;
  abstract forMaster(masterId: string): Observable<BookingView[]>;
  /** Checks ТЗ 6.10 conflicts without booking, so the UI can warn first. */
  abstract checkConflicts(
    clientId: string,
    slotId: string,
  ): Observable<{ overlapping: BookingView[]; tooClose: BookingView[] }>;
  abstract create(input: CreateBookingInput): Observable<CreateBookingResult>;
  /** Only the side that did not create the booking can confirm it (ТЗ 8.2). */
  abstract confirm(bookingId: string, by: Role): Observable<BookingView>;
  /** ТЗ 6.5: a reason is required; mutual cancellations have no consequences. */
  abstract cancel(
    bookingId: string,
    by: Role,
    reason: string,
    mutual?: boolean,
  ): Observable<BookingView>;
  /** ТЗ 6.8: an off-site booking entered by the master («не с сайта»). */
  abstract addExternal(input: ExternalBookingInput): Observable<BookingView>;
  abstract updateNote(bookingId: string, note: string): Observable<BookingView>;
  abstract markNoShow(bookingId: string): Observable<BookingView>;

  abstract slots(masterId: string): Observable<Slot[]>;
  /** ТЗ 6.1: generate free slots from working hours + slot length for `days` days. */
  abstract generateSlots(
    masterId: string,
    template: ScheduleTemplate,
    days: number,
  ): Observable<Slot[]>;
  abstract addSlot(masterId: string, start: IsoDate, durationMin: number): Observable<Slot>;
  /** The master can shift a free slot manually. */
  abstract moveSlot(slotId: string, start: IsoDate): Observable<Slot>;
  abstract removeSlot(slotId: string): Observable<void>;
}

// ── Chats (ТЗ 8) ──────────────────────────────────────────────────────────────

export interface ChatCounterpart {
  id: string;
  name: string;
  photoUrl: string | null;
  isMaster: boolean;
  online: boolean;
  subtitle: string;
}

export interface ChatSummary {
  chat: Chat;
  counterpart: ChatCounterpart;
  lastMessage: Message | null;
  lastMessagePreview: string;
  unread: number;
}

export interface ChatThread {
  chat: Chat;
  counterpart: ChatCounterpart;
  messages: Message[];
  bookings: BookingView[];
}

export abstract class ChatsApi {
  /** ТЗ 2.2: chats are separate per role; `role` is the viewer's active role. */
  abstract list(role: Role): Observable<ChatSummary[]>;
  abstract thread(chatId: string, role: Role): Observable<ChatThread>;
  abstract ensureChat(masterId: string, clientId: string): Observable<Chat>;
  abstract send(
    chatId: string,
    author: Role,
    content: { text?: string; imageUrl?: string },
  ): Observable<Message>;
  abstract edit(messageId: string, text: string): Observable<Message>;
  abstract remove(messageId: string): Observable<Message>;
  abstract markRead(chatId: string, role: Role): Observable<Chat>;
  abstract block(chatId: string, by: Role): Observable<Chat>;
  abstract unblock(chatId: string): Observable<Chat>;
  abstract deleteChat(chatId: string): Observable<void>;
}

// ── Reviews (client account) ──────────────────────────────────────────────────

export interface ReviewView extends Review {
  masterName: string;
  clientName: string;
  serviceName: string;
}

export abstract class ReviewsApi {
  /** ТЗ 7.6: reviews the client left, and reviews masters wrote about the client. */
  abstract forClient(
    clientId: string,
  ): Observable<{ written: ReviewView[]; aboutMe: ReviewView[] }>;
}

// ── Master cabinet (ТЗ 4, 7) ──────────────────────────────────────────────────

export interface CabinetClient {
  client: Client;
  nextBooking: BookingView | null;
  lastBooking: BookingView | null;
  visits: number;
  services: string[];
  reviews: ReviewView[];
}

export type StatsPeriod = 'day' | 'week' | 'month';

export interface CabinetStats {
  period: StatsPeriod;
  completed: number;
  noShow: number;
  cancelled: number;
  upcoming: number;
  /** Approximate revenue from completed bookings (ТЗ 7.3 «кольцо выручки»). */
  revenue: number;
  /** Expected revenue from confirmed upcoming bookings in the period. */
  expectedRevenue: number;
}

export interface ServiceProposal {
  categoryId: string;
  name: string;
}

export abstract class CabinetApi {
  abstract updateProfile(
    masterId: string,
    patch: Partial<Omit<Master, 'id' | 'services' | 'portfolio'>>,
  ): Observable<Master>;
  abstract saveService(
    masterId: string,
    service: Omit<MasterService, 'id'> & { id?: string },
  ): Observable<Master>;
  abstract removeService(masterId: string, serviceId: string): Observable<Master>;
  /** ТЗ 4.2: a service missing from the catalog goes to admin moderation. */
  abstract proposeService(
    masterId: string,
    proposal: ServiceProposal,
  ): Observable<{ status: 'moderation' }>;
  /** ТЗ 4.3: up to 9 photos, published immediately. */
  abstract addPortfolio(masterId: string, photos: Omit<PortfolioPhoto, 'id'>[]): Observable<Master>;
  abstract removePortfolio(masterId: string, photoIds: string[]): Observable<Master>;
  abstract requestVerification(masterId: string): Observable<Master>;
  abstract clients(masterId: string): Observable<CabinetClient[]>;
  abstract stats(masterId: string, period: StatsPeriod): Observable<CabinetStats>;
}

// ── Support («Напишите нам», ТЗ 11.1) ─────────────────────────────────────────

export abstract class SupportApi {
  abstract send(message: { text: string; contact?: string }): Observable<{ ticketId: string }>;
}

export const PORTFOLIO_LIMIT = 9;
