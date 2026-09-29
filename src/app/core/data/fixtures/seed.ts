// Builds the whole mock database relative to `now`, so the demo always has upcoming
// bookings, "today" schedules and fresh chats regardless of when it is opened.
import { findSubcategory } from '../catalog';
import {
  type Account,
  type Booking,
  type Chat,
  type Client,
  type Master,
  type Message,
  type Price,
  type Review,
  type Role,
  type Slot,
} from '../models';
import { MASTERS } from './masters.fixtures';

export interface MockDbState {
  masters: Master[];
  clients: Client[];
  account: Account;
  slots: Slot[];
  bookings: Booking[];
  chats: Chat[];
  messages: Message[];
  reviews: Review[];
}

export const ME_CLIENT_ID = 'c-me';
export const ME_MASTER_ID = 'm-me';

const MINSK_OFFSET_H = 3;
const MIN = 60_000;
const DAY = 86_400_000;

/** ISO timestamp for a Minsk wall-clock time `dayOffset` days from `now`. */
export function minskTime(now: Date, dayOffset: number, hhmm: string): string {
  const local = new Date(now.getTime() + MINSK_OFFSET_H * 3_600_000);
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const utc = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + dayOffset,
    h - MINSK_OFFSET_H,
    m,
  );
  return new Date(utc).toISOString();
}

/** A booking start `hoursAhead` from now, rounded up to the next half hour. */
function soon(now: Date, hoursAhead: number): string {
  const step = 30 * MIN;
  return new Date(Math.ceil((now.getTime() + hoursAhead * 3_600_000) / step) * step).toISOString();
}

/** ISO weekday (1 = Mon … 7 = Sun) of a Minsk day `dayOffset` days from `now`. */
function minskWeekday(now: Date, dayOffset: number): number {
  const d = new Date(now.getTime() + MINSK_OFFSET_H * 3_600_000 + dayOffset * DAY).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Deterministic PRNG so the demo data is stable between reloads. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const CLIENTS: Client[] = [
  {
    id: ME_CLIENT_ID,
    name: 'Анна Новикова',
    photoUrl: null,
    phone: '+375 (29) 123-45-67',
    email: 'anna.novikova@mail.by',
    telegram: 'anna_novikova',
    viber: '+375 (29) 123-45-67',
    preferredContact: 'messages',
  },
  ...(
    [
      ['c-alina', 'Алина Кравец', 5, '+375 (29) 611-20-33'],
      ['c-viktoria', 'Виктория Маслова', 10, '+375 (33) 702-45-18'],
      ['c-olga', 'Ольга Сенько', 15, '+375 (44) 555-12-09'],
      ['c-darya', 'Дарья Пинчук', 20, '+375 (29) 348-77-61'],
      ['c-elena', 'Елена Шарко', 25, '+375 (25) 901-66-40'],
      ['c-maria', 'Мария Лапицкая', 30, '+375 (33) 214-09-88'],
    ] as const
  ).map(([id, name, photo, phone]) => ({
    id,
    name,
    photoUrl: `https://randomuser.me/api/portraits/women/${photo}.jpg`,
    phone,
    email: `${id.slice(2)}@gmail.com`,
    preferredContact: (photo % 2 ? 'phone' : 'messages') as Client['preferredContact'],
  })),
];

function serviceOf(master: Master, subcategoryId: string): { price: Price; durationMin: number } {
  const service = master.services.find((s) => s.subcategoryId === subcategoryId);
  if (!service) throw new Error(`${master.id} has no ${subcategoryId}`);
  return { price: service.price, durationMin: service.durationMin };
}

export function buildSeed(now: Date): MockDbState {
  const masters = MASTERS.map((m) => ({ ...m }));
  const byId = new Map(masters.map((m) => [m.id, m]));
  const master = (id: string) => byId.get(id)!;

  const slots: Slot[] = [];
  const bookings: Booking[] = [];
  const chats: Chat[] = [];
  const messages: Message[] = [];
  const reviews: Review[] = [];
  let seq = 0;
  const id = (prefix: string) => `${prefix}-${++seq}`;
  const ago = (minutes: number) => new Date(now.getTime() - minutes * MIN).toISOString();

  // ── Slots from each master's template for the next 14 days (ТЗ 6.1) ─────────
  masters.forEach((m, mi) => {
    const rand = mulberry32(mi + 1);
    const { from, to, slotMinutes, workDays } = m.schedule;
    const [fh, fm] = from.split(':').map(Number) as [number, number];
    const [th, tm] = to.split(':').map(Number) as [number, number];
    for (let day = 0; day < 14; day++) {
      if (!workDays.includes(minskWeekday(now, day))) continue;
      for (let t = fh * 60 + fm; t + slotMinutes <= th * 60 + tm; t += slotMinutes) {
        const hhmm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const start = minskTime(now, day, hhmm);
        if (new Date(start) <= now) continue;
        const r = rand();
        // Busier in the next days, emptier further out.
        const busyChance = day < 3 ? 0.55 : 0.3;
        const status = r < busyChance * 0.8 ? 'booked' : r < busyChance ? 'busy' : 'free';
        slots.push({
          id: `${m.id}-${day}-${hhmm}`,
          masterId: m.id,
          start,
          durationMin: slotMinutes,
          status,
          bookingId: null,
        });
      }
    }
  });

  const findSlot = (masterId: string, start: string) =>
    slots.find((s) => s.masterId === masterId && s.start === start);

  /** Adds (or reuses) the slot at `start` and links it to the booking. */
  function occupy(booking: Booking): void {
    let slot = findSlot(booking.masterId, booking.start);
    if (!slot) {
      // Off-grid booking: drop template slots it overlaps, then add its own slot.
      const start = new Date(booking.start).getTime();
      const end = start + booking.durationMin * MIN;
      for (let i = slots.length - 1; i >= 0; i--) {
        const s = slots[i]!;
        const sStart = new Date(s.start).getTime();
        if (
          s.masterId === booking.masterId &&
          sStart < end &&
          start < sStart + s.durationMin * MIN
        ) {
          slots.splice(i, 1);
        }
      }
      slot = {
        id: id('slot'),
        masterId: booking.masterId,
        start: booking.start,
        durationMin: booking.durationMin,
        status: 'free',
        bookingId: null,
      };
      slots.push(slot);
    }
    booking.slotId = slot.id;
    slot.bookingId = booking.id;
    slot.status =
      booking.status === 'pending' ? 'pending' : booking.source === 'external' ? 'busy' : 'booked';
  }

  function chat(
    masterId: string,
    clientId: string,
    readAt: Partial<Record<Role, string>> = {},
  ): Chat {
    const c: Chat = {
      id: `chat-${masterId}-${clientId}`,
      masterId,
      clientId,
      readAt: {
        client: readAt.client ?? now.toISOString(),
        master: readAt.master ?? now.toISOString(),
      },
      blockedBy: null,
    };
    chats.push(c);
    return c;
  }

  function msg(
    c: Chat,
    author: Role | null,
    minutesAgo: number,
    text?: string,
    extra: Partial<Message> = {},
  ): void {
    messages.push({
      id: id('msg'),
      chatId: c.id,
      kind: 'text',
      author,
      text,
      sentAt: ago(minutesAgo),
      ...extra,
    });
  }

  function book(input: {
    masterId: string;
    clientId: string | null;
    subcategoryId: string;
    start: string;
    status: Booking['status'];
    createdBy?: Role;
    createdMinutesAgo?: number;
    source?: Booking['source'];
    externalClientName?: string;
    note?: string;
    chatId?: string | null;
    cancellation?: Booking['cancellation'];
  }): Booking {
    const m = master(input.masterId);
    const { price, durationMin } = serviceOf(m, input.subcategoryId);
    const b: Booking = {
      id: id('booking'),
      masterId: m.id,
      clientId: input.clientId,
      externalClientName: input.externalClientName,
      subcategoryId: input.subcategoryId,
      price,
      start: input.start,
      durationMin,
      address: m.address,
      status: input.status,
      source: input.source ?? 'site',
      createdBy: input.createdBy ?? 'client',
      createdAt: ago(input.createdMinutesAgo ?? 3 * 24 * 60),
      confirmedAt:
        input.status === 'confirmed' || input.status === 'completed' ? ago(60 * 24) : undefined,
      cancellation: input.cancellation,
      note: input.note,
      slotId: null,
      chatId: input.chatId ?? null,
    };
    bookings.push(b);
    if (new Date(b.start) > now && (b.status === 'pending' || b.status === 'confirmed')) occupy(b);
    return b;
  }

  // ── Signed-in user as a CLIENT (design: chats, «Записи», «Отзывы») ───────────
  const serova = chat('m-anna-serova', ME_CLIENT_ID, { client: ago(15) });
  msg(serova, 'client', 22, 'Здравствуйте! Хочу записаться на маникюр');
  msg(serova, 'master', 17, 'Привет! Конечно, когда вам удобно?');
  msg(serova, 'client', 12, 'Завтра с утра есть свободное время?');
  const serovaBooking = book({
    masterId: 'm-anna-serova',
    clientId: ME_CLIENT_ID,
    subcategoryId: 'manicure-combined',
    start: minskTime(now, 1, '10:00'),
    status: 'pending',
    createdBy: 'master', // ТЗ 6.3: master booked via the site → the client confirms
    createdMinutesAgo: 8,
    chatId: serova.id,
  });
  messages.push({
    id: id('msg'),
    chatId: serova.id,
    kind: 'booking',
    author: 'master',
    bookingId: serovaBooking.id,
    sentAt: ago(8),
  });
  msg(serova, 'master', 7, 'Жду вас завтра в 10:00 ✨');

  const kovaleva = chat('m-marina-kovaleva', ME_CLIENT_ID);
  const kovalevaBooking = book({
    masterId: 'm-marina-kovaleva',
    clientId: ME_CLIENT_ID,
    subcategoryId: 'brows-lamination',
    start: minskTime(now, 4, '14:00'),
    status: 'confirmed',
    chatId: kovaleva.id,
    createdMinutesAgo: 26 * 60,
  });
  msg(kovaleva, 'client', 26 * 60 + 5, 'Добрый день! Можно на ламинирование бровей?');
  messages.push({
    id: id('msg'),
    chatId: kovaleva.id,
    kind: 'booking',
    author: 'client',
    bookingId: kovalevaBooking.id,
    sentAt: ago(26 * 60),
  });
  msg(kovaleva, null, 25 * 60, 'Марина подтвердила запись', { kind: 'system' });
  msg(kovaleva, 'master', 24 * 60 + 30, 'Спасибо за доверие!');

  const pavlova = chat('m-yulia-pavlova', ME_CLIENT_ID, { client: ago(4 * 24 * 60) });
  msg(pavlova, 'client', 3 * 24 * 60 + 40, 'Здравствуйте, вы выезжаете на дом?');
  msg(pavlova, 'master', 3 * 24 * 60 + 20, 'Напишите ваш адрес, пожалуйста');

  // Past bookings of the client
  book({
    masterId: 'm-anna-serova',
    clientId: ME_CLIENT_ID,
    subcategoryId: 'manicure-gel',
    start: minskTime(now, -50, '11:30'),
    status: 'completed',
    chatId: serova.id,
  });
  book({
    masterId: 'm-oksana-lebed',
    clientId: ME_CLIENT_ID,
    subcategoryId: 'lashes-classic',
    start: minskTime(now, -75, '16:00'),
    status: 'completed',
  });
  book({
    masterId: 'm-yulia-pavlova',
    clientId: ME_CLIENT_ID,
    subcategoryId: 'cosmetology-cleansing',
    start: minskTime(now, -20, '12:00'),
    status: 'cancelled',
    chatId: pavlova.id,
    cancellation: {
      by: 'client',
      reason: 'Заболела, перенесу позже',
      mutual: true,
      at: ago(21 * 24 * 60),
    },
  });

  reviews.push(
    {
      id: id('review'),
      masterId: 'm-anna-serova',
      clientId: ME_CLIENT_ID,
      author: 'client',
      subcategoryId: 'manicure-gel',
      rating: 5,
      text: 'Отличная работа, очень довольна результатом!',
      date: minskTime(now, -50, '18:00'),
    },
    {
      id: id('review'),
      masterId: 'm-oksana-lebed',
      clientId: ME_CLIENT_ID,
      author: 'client',
      subcategoryId: 'lashes-classic',
      rating: 4,
      text: 'Работа аккуратная, но немного долго.',
      date: minskTime(now, -75, '20:00'),
    },
    // ТЗ 7.6 «Отзывы о нём»: masters' reviews about the client
    {
      id: id('review'),
      masterId: 'm-anna-serova',
      clientId: ME_CLIENT_ID,
      author: 'master',
      subcategoryId: 'manicure-gel',
      rating: 5,
      text: 'Пунктуальная и очень приятная клиентка, приходите ещё!',
      date: minskTime(now, -50, '19:00'),
    },
    {
      id: id('review'),
      masterId: 'm-oksana-lebed',
      clientId: ME_CLIENT_ID,
      author: 'master',
      subcategoryId: 'lashes-classic',
      rating: 5,
      text: 'Всё отлично, без опозданий.',
      date: minskTime(now, -75, '21:00'),
    },
  );

  // Reviews about the design masters from other clients (for profile pages)
  const reviewTexts: [number, string][] = [
    [5, 'Очень аккуратно и быстро, покрытие держится уже третью неделю.'],
    [5, 'Лучший мастер, к которому я ходила! Уютно и чисто.'],
    [4, 'Хорошо, но пришлось немного подождать.'],
    [5, 'Сделали именно то, что я хотела, спасибо!'],
    [3, 'В целом нормально, но форма не совсем та.'],
  ];
  masters.forEach((m, mi) => {
    if (m.reviewsCount === 0) return;
    CLIENTS.slice(1).forEach((c, ci) => {
      const [rating, text] = reviewTexts[(mi + ci) % reviewTexts.length]!;
      reviews.push({
        id: id('review'),
        masterId: m.id,
        clientId: c.id,
        author: 'client',
        subcategoryId: m.services[ci % m.services.length]!.subcategoryId,
        rating,
        text,
        date: minskTime(now, -(ci * 9 + mi + 3), '18:00'),
      });
    });
  });

  // ── Signed-in user as a MASTER (design: «Кабинет мастера», schedule today) ───
  const me = ME_MASTER_ID;
  const alinaChat = chat(me, 'c-alina');
  book({
    masterId: me,
    clientId: 'c-alina',
    subcategoryId: 'manicure-hardware',
    // Today's schedule is relative to now, so the cabinet looks alive at any hour.
    start: soon(now, 1),
    status: 'confirmed',
    chatId: alinaChat.id,
  });
  msg(alinaChat, 'client', 2 * 24 * 60, 'Анна, добрый вечер! Есть окошко на утро?');
  msg(alinaChat, 'master', 2 * 24 * 60 - 10, 'Да, записала вас на 9:00 😊');

  const vikaChat = chat(me, 'c-viktoria', { master: ago(60) });
  const vikaBooking = book({
    masterId: me,
    clientId: 'c-viktoria',
    subcategoryId: 'manicure-gel',
    start: soon(now, 2.5),
    status: 'pending',
    createdBy: 'client', // the master has to confirm
    createdMinutesAgo: 40,
    chatId: vikaChat.id,
  });
  msg(vikaChat, 'client', 41, 'Здравствуйте! Хочу покрытие, записалась на сегодня');
  messages.push({
    id: id('msg'),
    chatId: vikaChat.id,
    kind: 'booking',
    author: 'client',
    bookingId: vikaBooking.id,
    sentAt: ago(40),
  });

  book({
    masterId: me,
    clientId: null,
    externalClientName: 'Ирина (Instagram)',
    subcategoryId: 'manicure-gel',
    start: soon(now, 4),
    status: 'confirmed',
    source: 'external', // ТЗ 6.8 «не с сайта»
    createdBy: 'master',
    note: 'Постоянная клиентка, любит нюд. Оплата картой.',
  });

  const olgaChat = chat(me, 'c-olga');
  book({
    masterId: me,
    clientId: 'c-olga',
    subcategoryId: 'manicure-hardware',
    start: minskTime(now, 1, '10:30'),
    status: 'confirmed',
    chatId: olgaChat.id,
  });
  msg(olgaChat, 'client', 5 * 60, 'Спасибо, до завтра!');
  book({
    masterId: me,
    clientId: 'c-darya',
    subcategoryId: 'manicure-gel',
    start: minskTime(now, 3, '13:30'),
    status: 'confirmed',
  });
  book({
    masterId: me,
    clientId: 'c-elena',
    subcategoryId: 'manicure-removal',
    start: minskTime(now, 6, '16:30'),
    status: 'confirmed',
  });

  // History for statistics (ТЗ 7.3): completed, no-shows, cancellations over 30 days
  const history: [number, string, string, Booking['status']][] = [
    [-1, '10:30', 'c-alina', 'completed'],
    [-1, '15:00', 'c-maria', 'completed'],
    [-2, '12:00', 'c-darya', 'no-show'],
    [-3, '09:00', 'c-olga', 'completed'],
    [-4, '13:30', 'c-elena', 'cancelled'],
    [-5, '10:30', 'c-viktoria', 'completed'],
    [-6, '16:30', 'c-maria', 'completed'],
    [-8, '09:00', 'c-alina', 'completed'],
    [-9, '12:00', 'c-darya', 'completed'],
    [-11, '15:00', 'c-olga', 'completed'],
    [-13, '10:30', 'c-elena', 'no-show'],
    [-15, '13:30', 'c-viktoria', 'completed'],
    [-18, '09:00', 'c-maria', 'cancelled'],
    [-21, '12:00', 'c-alina', 'completed'],
    [-25, '16:30', 'c-darya', 'completed'],
    [-28, '10:30', 'c-olga', 'completed'],
  ];
  history.forEach(([day, time, clientId, status], i) =>
    book({
      masterId: me,
      clientId,
      subcategoryId: i % 3 === 0 ? 'manicure-hardware' : 'manicure-gel',
      start: minskTime(now, day, time),
      status,
      cancellation:
        status === 'cancelled'
          ? {
              by: 'client',
              reason: 'Изменились планы',
              mutual: false,
              at: ago(-day * 24 * 60 + 600),
            }
          : undefined,
    }),
  );
  reviews.push({
    id: id('review'),
    masterId: me,
    clientId: 'c-alina',
    author: 'client',
    subcategoryId: 'manicure-hardware',
    rating: 5,
    text: 'Анна — золото! Всегда аккуратно.',
    date: minskTime(now, -1, '19:00'),
  });

  const account: Account = {
    id: 'u-me',
    clientId: ME_CLIENT_ID,
    masterId: ME_MASTER_ID,
    notifications: { push: true, email: true, site: true, reminders: true },
    favoriteMasterIds: ['m-anna-serova', 'm-marina-kovaleva', 'm-yulia-pavlova', 'm-oksana-lebed'],
  };

  // Sanity check that every booking references a known service.
  bookings.forEach((b) => {
    if (!findSubcategory(b.subcategoryId)) throw new Error(`Bad subcategory ${b.subcategoryId}`);
  });

  return {
    masters,
    clients: CLIENTS.map((c) => ({ ...c })),
    account,
    slots,
    bookings,
    chats,
    messages,
    reviews,
  };
}
