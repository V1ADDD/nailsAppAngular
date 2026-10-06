import { Injectable, inject } from '@angular/core';
import { type Observable, defer } from 'rxjs';
import { mockError, mockResponse } from '@app/core/api/mock-response';
import {
  AccountApi,
  type AccountSnapshot,
  type BecomeMasterInput,
  BookingsApi,
  type BookingView,
  CabinetApi,
  type CabinetClient,
  type CabinetStats,
  type ChatSummary,
  type ChatThread,
  ChatsApi,
  type CreateBookingInput,
  type CreateBookingResult,
  type ExternalBookingInput,
  MastersApi,
  PORTFOLIO_LIMIT,
  ReviewsApi,
  type ServiceProposal,
  type StatsPeriod,
  SupportApi,
} from '../api';
import { subcategoryName } from '../catalog';
import { ME_CLIENT_ID } from '../fixtures/seed';
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
} from '../models';
import {
  bookingConflicts,
  expectedRevenue,
  overlaps,
  priceValue,
  slotStatusFor,
  templateTimes,
} from '../rules';
import { MockDb } from './mock-db';

/** Runs `fn` against the mock DB lazily (on subscribe) and returns its result with latency. */
function run<T>(db: MockDb, fn: () => T): Observable<T> {
  return defer(() => {
    try {
      db.sweep();
      return mockResponse(fn());
    } catch (e) {
      return mockError(e instanceof Error ? e.message : 'Что-то пошло не так');
    }
  });
}

const byStart = (a: { start: string }, b: { start: string }) => a.start.localeCompare(b.start);

// ── Masters ───────────────────────────────────────────────────────────────────

@Injectable()
export class MockMastersApi extends MastersApi {
  private readonly db = inject(MockDb);

  list(): Observable<Master[]> {
    return run(this.db, () =>
      this.db.state.masters.filter((m) => !this.db.deletedMasters.has(m.id)),
    );
  }

  getById(id: string): Observable<Master> {
    return run(this.db, () => this.db.master(id));
  }

  getSlots(masterId: string, viewer: Role): Observable<Slot[]> {
    return run(this.db, () => {
      const now = this.db.now().toISOString();
      return this.db.state.slots
        .filter((s) => s.masterId === masterId && s.start > now)
        .sort(byStart)
        .map((s) => ({ ...s, status: slotStatusFor(viewer, s.status) as Slot['status'] }));
    });
  }

  getReviews(masterId: string): Observable<Review[]> {
    return run(this.db, () =>
      this.db.state.reviews
        .filter((r) => r.masterId === masterId && r.author === 'client')
        .sort((a, b) => b.date.localeCompare(a.date)),
    );
  }
}

// ── Account ───────────────────────────────────────────────────────────────────

@Injectable()
export class MockAccountApi extends AccountApi {
  private readonly db = inject(MockDb);

  private snapshot(): AccountSnapshot {
    const { account } = this.db.state;
    return {
      account,
      client: this.db.client(account.clientId),
      master: account.masterId ? this.db.master(account.masterId) : null,
    };
  }

  me(): Observable<AccountSnapshot> {
    return run(this.db, () => this.snapshot());
  }

  updateClient(patch: Partial<Omit<Client, 'id'>>): Observable<Client> {
    return run(this.db, () => {
      const current = this.db.client(this.db.state.account.clientId);
      const next = { ...current, ...patch };
      this.db.state.clients = this.db.state.clients.map((c) => (c.id === next.id ? next : c));
      return next;
    });
  }

  updateNotifications(patch: Partial<NotificationSettings>): Observable<Account> {
    return run(this.db, () => {
      const account = this.db.state.account;
      this.db.state.account = { ...account, notifications: { ...account.notifications, ...patch } };
      return this.db.state.account;
    });
  }

  toggleFavorite(masterId: string): Observable<Account> {
    return run(this.db, () => {
      const account = this.db.state.account;
      const ids = account.favoriteMasterIds;
      this.db.state.account = {
        ...account,
        favoriteMasterIds: ids.includes(masterId)
          ? ids.filter((id) => id !== masterId)
          : [...ids, masterId],
      };
      return this.db.state.account;
    });
  }

  deleteMasterProfile(): Observable<AccountSnapshot> {
    return run(this.db, () => {
      const account = this.db.state.account;
      const masterId = account.masterId;
      if (!masterId) return this.snapshot();
      const now = this.db.now();
      for (const b of this.db.state.bookings) {
        const active = b.status === 'pending' || b.status === 'confirmed';
        if (b.masterId !== masterId || !active || new Date(b.start) <= now) continue;
        b.status = 'cancelled';
        b.cancellation = {
          by: 'master',
          reason: 'Мастер удалил профиль',
          mutual: false,
          at: now.toISOString(),
        };
      }
      this.db.state.slots = this.db.state.slots.filter(
        (s) => s.masterId !== masterId || new Date(s.start) <= now,
      );
      this.db.deletedMasters.add(masterId);
      this.db.state.account = { ...account, masterId: null };
      return this.snapshot();
    });
  }

  becomeMaster(input: BecomeMasterInput): Observable<AccountSnapshot> {
    return run(this.db, () => {
      const account = this.db.state.account;
      if (account.masterId) return this.snapshot();
      const client = this.db.client(account.clientId);
      const master: Master = {
        id: this.db.nextId('m'),
        organizationId: null,
        name: client.name,
        photoUrl: client.photoUrl,
        categoryIds: input.categoryIds,
        specialty: input.specialty,
        city: input.city,
        district: '',
        address: input.address,
        location: { lat: 53.9038, lng: 27.5567 },
        rating: 0,
        reviewsCount: 0,
        experienceYears: 0,
        verification: 'none',
        online: true,
        replyMinutes: 30,
        about: '',
        courses: [],
        contacts: {
          phone: client.phone,
          email: client.email,
          telegram: client.telegram,
          viber: client.viber,
        },
        services: [],
        portfolio: [],
        bookingsCount: 0,
        schedule: {
          workDays: [1, 2, 3, 4, 5],
          from: '10:00',
          to: '19:00',
          slotMinutes: 90,
          breaks: [],
          capacity: 1,
        },
        autoConfirm: { enabled: false, afterMinutes: 30 },
      };
      this.db.state.masters.push(master);
      this.db.state.account = { ...account, masterId: master.id };
      return this.snapshot();
    });
  }
}

// ── Bookings & slots ──────────────────────────────────────────────────────────

@Injectable()
export class MockBookingsApi extends BookingsApi {
  private readonly db = inject(MockDb);

  forClient(clientId: string): Observable<BookingView[]> {
    return run(this.db, () =>
      this.db.state.bookings
        .filter((b) => b.clientId === clientId)
        .sort(byStart)
        .map((b) => this.db.bookingView(b)),
    );
  }

  forMaster(masterId: string): Observable<BookingView[]> {
    return run(this.db, () =>
      this.db.state.bookings
        .filter((b) => b.masterId === masterId)
        .sort(byStart)
        .map((b) => this.db.bookingView(b)),
    );
  }

  private conflictsFor(clientId: string, slot: Slot) {
    const mine = this.db.state.bookings.filter((b) => b.clientId === clientId);
    const { overlapping, tooClose } = bookingConflicts(slot, mine);
    return {
      overlapping: overlapping.map((b) => this.db.bookingView(b)),
      tooClose: tooClose.map((b) => this.db.bookingView(b)),
    };
  }

  checkConflicts(clientId: string, slotId: string) {
    return run(this.db, () => this.conflictsFor(clientId, this.slot(slotId)));
  }

  private slot(slotId: string): Slot {
    const slot = this.db.state.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error('Окно не найдено');
    return slot;
  }

  create(input: CreateBookingInput): Observable<CreateBookingResult> {
    return run(this.db, () => {
      const slot = this.slot(input.slotId);
      if (slot.status !== 'free') throw new Error('Это окно уже занято, выберите другое время');
      const master = this.db.master(input.masterId);
      if (master.id === this.db.state.account.masterId && input.createdBy === 'client') {
        throw new Error('Нельзя записаться к самой себе');
      }
      const service = master.services.find((s) => s.subcategoryId === input.subcategoryId);
      if (!service) throw new Error('Мастер не оказывает эту услугу');

      // ТЗ 6.10: one client can't hold two bookings at the same time.
      const { overlapping, tooClose } = this.conflictsFor(input.clientId, slot);
      const now = this.db.now().toISOString();
      for (const old of overlapping) {
        const b = this.db.booking(old.id);
        b.status = 'cancelled';
        b.cancellation = {
          by: 'client',
          reason: 'Автоматически: новая запись на это же время',
          mutual: true,
          at: now,
        };
        this.db.freeSlotOf(b);
        this.db.systemMessage(
          b.chatId,
          'Запись отменена автоматически: клиент записался на это же время к другому мастеру',
        );
      }

      // ТЗ 6.3: booking creates (or reuses) the chat of this master–client pair.
      const chat = this.ensureChat(master.id, input.clientId);
      const booking: Booking = {
        id: this.db.nextId('booking'),
        masterId: master.id,
        clientId: input.clientId,
        subcategoryId: service.subcategoryId,
        price: service.price,
        start: slot.start,
        durationMin: Math.max(service.durationMin, slot.durationMin),
        address: master.address,
        status: 'pending',
        source: 'site',
        createdBy: input.createdBy,
        createdAt: now,
        slotId: slot.id,
        chatId: chat.id,
      };
      this.db.state.bookings.push(booking);
      slot.status = 'pending';
      slot.bookingId = booking.id;
      this.db.state.messages.push({
        id: this.db.nextId('msg'),
        chatId: chat.id,
        kind: 'booking',
        author: input.createdBy,
        bookingId: booking.id,
        sentAt: now,
      });
      chat.readAt = { ...chat.readAt, [input.createdBy]: now };
      return {
        booking: this.db.bookingView(booking),
        chatId: chat.id,
        autoCancelled: overlapping.map((b) => this.db.bookingView(this.db.booking(b.id))),
        tooClose,
      };
    });
  }

  private ensureChat(masterId: string, clientId: string): Chat {
    let chat = this.db.state.chats.find((c) => c.masterId === masterId && c.clientId === clientId);
    if (!chat) {
      const now = this.db.now().toISOString();
      chat = {
        id: `chat-${masterId}-${clientId}`,
        masterId,
        clientId,
        readAt: { client: now, master: now },
        blockedBy: null,
      };
      this.db.state.chats.push(chat);
    }
    return chat;
  }

  confirm(bookingId: string, by: Role): Observable<BookingView> {
    return run(this.db, () => {
      const b = this.db.booking(bookingId);
      if (b.status !== 'pending') throw new Error('Запись уже не ожидает подтверждения');
      if (b.createdBy === by) throw new Error('Запись подтверждает другая сторона');
      b.status = 'confirmed';
      b.confirmedAt = this.db.now().toISOString();
      const slot = this.db.state.slots.find((s) => s.id === b.slotId);
      if (slot) slot.status = 'booked';
      this.db.systemMessage(
        b.chatId,
        by === 'master' ? 'Мастер подтвердил запись' : 'Клиент подтвердил запись',
      );
      return this.db.bookingView(b);
    });
  }

  cancel(bookingId: string, by: Role, reason: string, mutual = false): Observable<BookingView> {
    return run(this.db, () => {
      if (!reason.trim()) throw new Error('Укажите причину отмены');
      const b = this.db.booking(bookingId);
      if (b.status !== 'pending' && b.status !== 'confirmed')
        throw new Error('Эту запись уже нельзя отменить');
      b.status = 'cancelled';
      b.cancellation = { by, reason: reason.trim(), mutual, at: this.db.now().toISOString() };
      this.db.freeSlotOf(b);
      this.db.systemMessage(
        b.chatId,
        `${by === 'master' ? 'Мастер' : 'Клиент'} отменил запись. Причина: ${reason.trim()}`,
      );
      return this.db.bookingView(b);
    });
  }

  addExternal(input: ExternalBookingInput): Observable<BookingView> {
    return run(this.db, () => {
      const master = this.db.master(input.masterId);
      const service = master.services.find((s) => s.subcategoryId === input.subcategoryId);
      if (!service) throw new Error('Добавьте эту услугу в прайс');
      let slot = this.db.state.slots.find(
        (s) => s.masterId === master.id && s.start === input.start,
      );
      if (slot && slot.status !== 'free') throw new Error('Это окно уже занято');
      if (!slot) {
        slot = {
          id: this.db.nextId('slot'),
          masterId: master.id,
          start: input.start,
          durationMin: service.durationMin,
          status: 'free',
          bookingId: null,
        };
        this.db.state.slots.push(slot);
      }
      const booking: Booking = {
        id: this.db.nextId('booking'),
        masterId: master.id,
        clientId: null,
        externalClientName: input.clientName,
        subcategoryId: service.subcategoryId,
        price: service.price,
        start: input.start,
        durationMin: service.durationMin,
        address: master.address,
        status: 'confirmed',
        source: 'external',
        createdBy: 'master',
        createdAt: this.db.now().toISOString(),
        note: input.note,
        slotId: slot.id,
        chatId: null,
      };
      this.db.state.bookings.push(booking);
      slot.status = 'busy';
      slot.bookingId = booking.id;
      return this.db.bookingView(booking);
    });
  }

  updateNote(bookingId: string, note: string): Observable<BookingView> {
    return run(this.db, () => {
      const b = this.db.booking(bookingId);
      b.note = note;
      return this.db.bookingView(b);
    });
  }

  markNoShow(bookingId: string): Observable<BookingView> {
    return run(this.db, () => {
      const b = this.db.booking(bookingId);
      b.status = 'no-show';
      return this.db.bookingView(b);
    });
  }

  slots(masterId: string): Observable<Slot[]> {
    return run(this.db, () =>
      this.db.state.slots.filter((s) => s.masterId === masterId).sort(byStart),
    );
  }

  generateSlots(masterId: string, template: ScheduleTemplate, days: number): Observable<Slot[]> {
    return run(this.db, () => {
      const master = this.db.master(masterId);
      this.db.replaceMaster({ ...master, schedule: template });
      const now = this.db.now();
      // Replace future free slots; keep anything booked.
      this.db.state.slots = this.db.state.slots.filter(
        (s) => s.masterId !== masterId || s.status !== 'free' || new Date(s.start) <= now,
      );
      const taken = this.db.state.slots.filter((s) => s.masterId === masterId);
      const times = templateTimes(template);
      const minskNow = new Date(now.getTime() + 3 * 3_600_000);
      for (let day = 0; day < days; day++) {
        const d = new Date(
          Date.UTC(minskNow.getUTCFullYear(), minskNow.getUTCMonth(), minskNow.getUTCDate() + day),
        );
        const weekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
        if (!template.workDays.includes(weekday)) continue;
        const key = d.toISOString().slice(0, 10);
        for (const time of times) {
          const start = new Date(`${key}T${time}:00+03:00`);
          if (start <= now) continue;
          const candidate = { start: start.toISOString(), durationMin: template.slotMinutes };
          // Parallel places (capacity) minus whatever already occupies this time.
          const clashes = taken.filter((s) => overlaps(s, candidate)).length;
          for (let place = clashes; place < template.capacity; place++) {
            this.db.state.slots.push({
              id: this.db.nextId('slot'),
              masterId,
              status: 'free',
              bookingId: null,
              ...candidate,
            });
          }
        }
      }
      return this.db.state.slots.filter((s) => s.masterId === masterId).sort(byStart);
    });
  }

  addSlot(masterId: string, start: IsoDate, durationMin: number): Observable<Slot> {
    return run(this.db, () => {
      if (new Date(start) <= this.db.now()) throw new Error('Это время уже прошло');
      const slot: Slot = {
        id: this.db.nextId('slot'),
        masterId,
        start,
        durationMin,
        status: 'free',
        bookingId: null,
      };
      this.db.state.slots.push(slot);
      return slot;
    });
  }

  moveSlot(slotId: string, start: IsoDate): Observable<Slot> {
    return run(this.db, () => {
      const slot = this.slot(slotId);
      if (slot.status !== 'free') throw new Error('Сдвинуть можно только свободное окно');
      slot.start = start;
      return slot;
    });
  }

  removeSlot(slotId: string): Observable<void> {
    return run(this.db, () => {
      const slot = this.slot(slotId);
      if (slot.status !== 'free') throw new Error('Удалить можно только свободное окно');
      this.db.state.slots = this.db.state.slots.filter((s) => s.id !== slotId);
    });
  }
}

// ── Chats ─────────────────────────────────────────────────────────────────────

function preview(message: Message | null, db: MockDb): string {
  if (!message) return 'Нет сообщений';
  if (message.deleted) return 'Сообщение удалено';
  if (message.kind === 'booking' && message.bookingId) {
    return `Запись: ${subcategoryName(db.booking(message.bookingId).subcategoryId)}`;
  }
  if (message.imageUrl && !message.text) return '📷 Фото';
  return message.text ?? '';
}

@Injectable()
export class MockChatsApi extends ChatsApi {
  private readonly db = inject(MockDb);

  private visibleTo(role: Role): Chat[] {
    const { account } = this.db.state;
    // ТЗ 2.2: client-mode chats and master-mode chats are separate.
    return this.db.state.chats.filter((c) =>
      role === 'client' ? c.clientId === account.clientId : c.masterId === account.masterId,
    );
  }

  private messagesOf(chatId: string): Message[] {
    return this.db.state.messages
      .filter((m) => m.chatId === chatId)
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  list(role: Role): Observable<ChatSummary[]> {
    return run(this.db, () =>
      this.visibleTo(role)
        .map((chat) => {
          const messages = this.messagesOf(chat.id);
          const last = messages.at(-1) ?? null;
          return {
            chat,
            counterpart: this.db.counterpart(chat, role),
            lastMessage: last,
            lastMessagePreview: preview(last, this.db),
            unread: messages.filter(
              (m) => m.author && m.author !== role && m.sentAt > chat.readAt[role],
            ).length,
          };
        })
        .sort((a, b) => (b.lastMessage?.sentAt ?? '').localeCompare(a.lastMessage?.sentAt ?? '')),
    );
  }

  thread(chatId: string, role: Role): Observable<ChatThread> {
    return run(this.db, () => {
      const chat = this.db.chat(chatId);
      if (!this.visibleTo(role).includes(chat))
        throw new Error('Этот чат доступен в другом режиме профиля');
      return {
        chat,
        counterpart: this.db.counterpart(chat, role),
        messages: this.messagesOf(chatId),
        bookings: this.db.state.bookings
          .filter((b) => b.chatId === chatId)
          .map((b) => this.db.bookingView(b)),
      };
    });
  }

  ensureChat(masterId: string, clientId: string): Observable<Chat> {
    return run(this.db, () => {
      let chat = this.db.state.chats.find(
        (c) => c.masterId === masterId && c.clientId === clientId,
      );
      if (!chat) {
        const now = this.db.now().toISOString();
        chat = {
          id: `chat-${masterId}-${clientId}`,
          masterId,
          clientId,
          readAt: { client: now, master: now },
          blockedBy: null,
        };
        this.db.state.chats.push(chat);
      }
      return chat;
    });
  }

  send(
    chatId: string,
    author: Role,
    content: { text?: string; imageUrl?: string },
  ): Observable<Message> {
    return run(this.db, () => {
      const chat = this.db.chat(chatId);
      if (chat.blockedBy) throw new Error('Чат заблокирован, писать нельзя');
      if (!content.text?.trim() && !content.imageUrl) throw new Error('Пустое сообщение');
      const now = this.db.now().toISOString();
      const message: Message = {
        id: this.db.nextId('msg'),
        chatId,
        kind: 'text',
        author,
        text: content.text?.trim() || undefined,
        imageUrl: content.imageUrl,
        sentAt: now,
      };
      this.db.state.messages.push(message);
      chat.readAt = { ...chat.readAt, [author]: now };
      return message;
    });
  }

  edit(messageId: string, text: string): Observable<Message> {
    return run(this.db, () => {
      const message = this.message(messageId);
      message.text = text.trim();
      message.editedAt = this.db.now().toISOString(); // ТЗ 8.5: visible to the other side
      return message;
    });
  }

  remove(messageId: string): Observable<Message> {
    return run(this.db, () => {
      const message = this.message(messageId);
      message.deleted = true;
      message.text = undefined;
      message.imageUrl = undefined;
      return message;
    });
  }

  private message(id: string): Message {
    const message = this.db.state.messages.find((m) => m.id === id);
    if (!message) throw new Error('Сообщение не найдено');
    return message;
  }

  markRead(chatId: string, role: Role): Observable<Chat> {
    return run(this.db, () => {
      const chat = this.db.chat(chatId);
      chat.readAt = { ...chat.readAt, [role]: this.db.now().toISOString() };
      return chat;
    });
  }

  block(chatId: string, by: Role): Observable<Chat> {
    return run(this.db, () => {
      const chat = this.db.chat(chatId);
      chat.blockedBy = by;
      return chat;
    });
  }

  unblock(chatId: string): Observable<Chat> {
    return run(this.db, () => {
      const chat = this.db.chat(chatId);
      chat.blockedBy = null;
      return chat;
    });
  }

  deleteChat(chatId: string): Observable<void> {
    return run(this.db, () => {
      this.db.state.chats = this.db.state.chats.filter((c) => c.id !== chatId);
      this.db.state.messages = this.db.state.messages.filter((m) => m.chatId !== chatId);
    });
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

@Injectable()
export class MockReviewsApi extends ReviewsApi {
  private readonly db = inject(MockDb);

  forClient(clientId: string) {
    return run(this.db, () => {
      const mine = this.db.state.reviews
        .filter((r) => r.clientId === clientId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => this.db.reviewView(r));
      return {
        written: mine.filter((r) => r.author === 'client'),
        aboutMe: mine.filter((r) => r.author === 'master'),
      };
    });
  }
}

// ── Master cabinet ────────────────────────────────────────────────────────────

const PERIOD_DAYS: Record<StatsPeriod, number> = { day: 1, week: 7, month: 30 };

@Injectable()
export class MockCabinetApi extends CabinetApi {
  private readonly db = inject(MockDb);

  updateProfile(
    masterId: string,
    patch: Partial<Omit<Master, 'id' | 'services' | 'portfolio'>>,
  ): Observable<Master> {
    return run(this.db, () => this.db.replaceMaster({ ...this.db.master(masterId), ...patch }));
  }

  saveService(
    masterId: string,
    service: Omit<MasterService, 'id'> & { id?: string },
  ): Observable<Master> {
    return run(this.db, () => {
      const master = this.db.master(masterId);
      const exists = master.services.some(
        (s) => s.id === service.id || s.subcategoryId === service.subcategoryId,
      );
      const saved: MasterService = {
        ...service,
        id: service.id ?? this.db.nextId(`${masterId}-s`),
      };
      const services = exists
        ? master.services.map((s) =>
            s.id === service.id || s.subcategoryId === service.subcategoryId
              ? { ...saved, id: s.id }
              : s,
          )
        : [...master.services, saved];
      return this.db.replaceMaster({ ...master, services });
    });
  }

  removeService(masterId: string, serviceId: string): Observable<Master> {
    return run(this.db, () => {
      const master = this.db.master(masterId);
      return this.db.replaceMaster({
        ...master,
        services: master.services.filter((s) => s.id !== serviceId),
      });
    });
  }

  proposeService(
    _masterId: string,
    proposal: ServiceProposal,
  ): Observable<{ status: 'moderation' }> {
    return run(this.db, () => {
      if (!proposal.name.trim()) throw new Error('Введите название услуги');
      return { status: 'moderation' as const };
    });
  }

  addPortfolio(masterId: string, photos: Omit<PortfolioPhoto, 'id'>[]): Observable<Master> {
    return run(this.db, () => {
      const master = this.db.master(masterId);
      if (master.portfolio.length + photos.length > PORTFOLIO_LIMIT) {
        throw new Error(`В портфолио помещается не больше ${PORTFOLIO_LIMIT} фото`);
      }
      const added = photos.map((p) => ({ ...p, id: this.db.nextId(`${masterId}-p`) }));
      return this.db.replaceMaster({ ...master, portfolio: [...master.portfolio, ...added] });
    });
  }

  removePortfolio(masterId: string, photoIds: string[]): Observable<Master> {
    return run(this.db, () => {
      const master = this.db.master(masterId);
      return this.db.replaceMaster({
        ...master,
        portfolio: master.portfolio.filter((p) => !photoIds.includes(p.id)),
      });
    });
  }

  requestVerification(masterId: string): Observable<Master> {
    return run(this.db, () =>
      this.db.replaceMaster({ ...this.db.master(masterId), verification: 'pending' }),
    );
  }

  clients(masterId: string): Observable<CabinetClient[]> {
    return run(this.db, () => {
      const now = this.db.now().toISOString();
      const bookings = this.db.state.bookings.filter((b) => b.masterId === masterId && b.clientId);
      const clientIds = [...new Set(bookings.map((b) => b.clientId!))];
      return (
        clientIds
          .map((clientId) => {
            const own = bookings.filter((b) => b.clientId === clientId).sort(byStart);
            const next = own.find(
              (b) => b.start > now && (b.status === 'pending' || b.status === 'confirmed'),
            );
            const last = [...own].reverse().find((b) => b.start <= now && b.status === 'completed');
            return {
              client: this.db.client(clientId),
              nextBooking: next ? this.db.bookingView(next) : null,
              lastBooking: last ? this.db.bookingView(last) : null,
              visits: own.filter((b) => b.status === 'completed').length,
              services: [...new Set(own.map((b) => subcategoryName(b.subcategoryId)))],
              reviews: this.db.state.reviews
                .filter(
                  (r) =>
                    r.clientId === clientId && r.author === 'master' && r.masterId === masterId,
                )
                .map((r) => this.db.reviewView(r)),
            };
          })
          // ТЗ 7.4: sorted by the nearest booking; clients without one go last.
          .sort((a, b) => {
            const x = a.nextBooking?.start;
            const y = b.nextBooking?.start;
            if (x && y) return x < y ? -1 : x > y ? 1 : 0;
            return x ? -1 : y ? 1 : 0;
          })
      );
    });
  }

  stats(masterId: string, period: StatsPeriod): Observable<CabinetStats> {
    return run(this.db, () => {
      const now = this.db.now().getTime();
      const span = PERIOD_DAYS[period] * 86_400_000;
      const inPast = (b: Booking) => {
        const t = new Date(b.start).getTime();
        return t <= now && t > now - span;
      };
      const inFuture = (b: Booking) => {
        const t = new Date(b.start).getTime();
        return t > now && t <= now + span;
      };
      const own = this.db.state.bookings.filter((b) => b.masterId === masterId);
      const past = own.filter(inPast);
      const upcoming = own.filter(
        (b) => inFuture(b) && (b.status === 'confirmed' || b.status === 'pending'),
      );
      const forecast = expectedRevenue(upcoming, this.db.master(masterId).services);
      return {
        period,
        completed: past.filter((b) => b.status === 'completed').length,
        noShow: past.filter((b) => b.status === 'no-show').length,
        cancelled: own.filter((b) => b.status === 'cancelled' && (inPast(b) || inFuture(b))).length,
        upcoming: upcoming.length,
        revenue: past
          .filter((b) => b.status === 'completed')
          .reduce((sum, b) => sum + priceValue(b.price), 0),
        expectedRevenue: forecast.reduce((sum, line) => sum + line.total, 0),
        expectedByService: forecast.map((line) => ({
          ...line,
          serviceName: subcategoryName(line.subcategoryId),
        })),
      };
    });
  }
}

// ── Support ───────────────────────────────────────────────────────────────────

@Injectable()
export class MockSupportApi extends SupportApi {
  private readonly db = inject(MockDb);

  send(message: { text: string; contact?: string }): Observable<{ ticketId: string }> {
    return run(this.db, () => {
      if (!message.text.trim()) throw new Error('Напишите, чем мы можем помочь');
      return { ticketId: this.db.nextId('ticket') };
    });
  }
}

/** Providers wiring every API token to its mock implementation (see app.config.ts). */
export const MOCK_API_PROVIDERS = [
  { provide: MastersApi, useClass: MockMastersApi },
  { provide: AccountApi, useClass: MockAccountApi },
  { provide: BookingsApi, useClass: MockBookingsApi },
  { provide: ChatsApi, useClass: MockChatsApi },
  { provide: ReviewsApi, useClass: MockReviewsApi },
  { provide: CabinetApi, useClass: MockCabinetApi },
  { provide: SupportApi, useClass: MockSupportApi },
];

export { ME_CLIENT_ID };
