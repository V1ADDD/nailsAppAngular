import { Injectable, InjectionToken, inject } from '@angular/core';
import { type BookingView, type ChatCounterpart, type ReviewView } from '../api';
import { subcategoryName } from '../catalog';
import { buildSeed, type MockDbState } from '../fixtures/seed';
import {
  type Booking,
  type Chat,
  type Client,
  type Master,
  type Review,
  type Role,
} from '../models';
import { pendingReleaseAt } from '../rules';

/** Current time source; overridden in tests. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/**
 * In-memory "backend" shared by all mock APIs, so a booking made on a master's page
 * shows up in chats, the client's records and the master's schedule.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  readonly now = inject(CLOCK);
  readonly state: MockDbState = buildSeed(this.now());
  private seq = 1000;

  nextId(prefix: string): string {
    return `${prefix}-${++this.seq}`;
  }

  master(id: string): Master {
    const master = this.state.masters.find((m) => m.id === id);
    if (!master) throw new Error(`Мастер не найден`);
    return master;
  }

  client(id: string): Client {
    const client = this.state.clients.find((c) => c.id === id);
    if (!client) throw new Error(`Клиент не найден`);
    return client;
  }

  booking(id: string): Booking {
    const booking = this.state.bookings.find((b) => b.id === id);
    if (!booking) throw new Error(`Запись не найдена`);
    return booking;
  }

  chat(id: string): Chat {
    const chat = this.state.chats.find((c) => c.id === id);
    if (!chat) throw new Error(`Чат не найден`);
    return chat;
  }

  replaceMaster(next: Master): Master {
    this.state.masters = this.state.masters.map((m) => (m.id === next.id ? next : m));
    return next;
  }

  bookingView(b: Booking): BookingView {
    const master = this.master(b.masterId);
    const client = b.clientId ? this.state.clients.find((c) => c.id === b.clientId) : undefined;
    return {
      ...b,
      masterName: master.name,
      masterPhotoUrl: master.photoUrl,
      clientName: client?.name ?? b.externalClientName ?? 'Клиент',
      clientPhotoUrl: client?.photoUrl ?? null,
      serviceName: subcategoryName(b.subcategoryId),
      releaseAt: b.status === 'pending' ? pendingReleaseAt(b).toISOString() : null,
    };
  }

  reviewView(r: Review): ReviewView {
    return {
      ...r,
      masterName: this.master(r.masterId).name,
      clientName: this.client(r.clientId).name,
      serviceName: subcategoryName(r.subcategoryId),
    };
  }

  counterpart(chat: Chat, viewer: Role): ChatCounterpart {
    if (viewer === 'client') {
      const m = this.master(chat.masterId);
      return {
        id: m.id,
        name: m.name,
        photoUrl: m.photoUrl,
        isMaster: true,
        online: m.online,
        subtitle: m.specialty,
      };
    }
    const c = this.client(chat.clientId);
    return {
      id: c.id,
      name: c.name,
      photoUrl: c.photoUrl,
      isMaster: false,
      online: false,
      subtitle: c.phone,
    };
  }

  /** Adds a system message to the booking's chat, if it has one. */
  systemMessage(chatId: string | null, text: string): void {
    if (!chatId) return;
    this.state.messages.push({
      id: this.nextId('msg'),
      chatId,
      kind: 'system',
      author: null,
      text,
      sentAt: this.now().toISOString(),
    });
  }

  freeSlotOf(booking: Booking): void {
    const slot = this.state.slots.find((s) => s.id === booking.slotId);
    if (slot) {
      slot.status = 'free';
      slot.bookingId = null;
    }
  }

  /**
   * Applies time-based rules, run before every API call:
   * - ТЗ 6.4 auto-confirm after the master's chosen delay;
   * - ТЗ 6.4 release the slot of an unconfirmed booking 24 h / 2 h before the start;
   * - past confirmed bookings become completed.
   */
  sweep(): void {
    const now = this.now();
    for (const b of this.state.bookings) {
      if (b.status === 'pending') {
        const master = this.master(b.masterId);
        const autoAt = new Date(b.createdAt).getTime() + master.autoConfirm.afterMinutes * 60_000;
        if (b.createdBy === 'client' && master.autoConfirm.enabled && autoAt <= now.getTime()) {
          b.status = 'confirmed';
          b.confirmedAt = now.toISOString();
          const slot = this.state.slots.find((s) => s.id === b.slotId);
          if (slot) slot.status = 'booked';
          this.systemMessage(b.chatId, 'Запись подтверждена автоматически');
        } else if (pendingReleaseAt(b) <= now) {
          b.status = 'cancelled';
          b.cancellation = {
            by: b.createdBy === 'client' ? 'master' : 'client',
            reason: 'Запись не подтверждена вовремя — окно освободилось',
            mutual: true,
            at: now.toISOString(),
            expired: true,
          };
          this.freeSlotOf(b);
          this.systemMessage(
            b.chatId,
            'Запись не подтвердили вовремя, окно освободилось. Её можно восстановить в чате.',
          );
        }
      } else if (
        b.status === 'confirmed' &&
        new Date(b.start).getTime() + b.durationMin * 60_000 < now.getTime()
      ) {
        b.status = 'completed';
      }
    }
  }
}
