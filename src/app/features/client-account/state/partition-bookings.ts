import { type BookingView } from '@app/core/data/api';

export interface BookingGroups {
  upcoming: BookingView[];
  past: BookingView[];
}

/**
 * ТЗ 7.6: upcoming = pending/confirmed bookings that start in the future (soonest first);
 * everything else (completed, no-show, cancelled, or already started) is past (newest first).
 */
export function partitionBookings(
  bookings: readonly BookingView[],
  now: Date = new Date(),
): BookingGroups {
  const nowMs = now.getTime();
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  for (const booking of bookings) {
    const active = booking.status === 'pending' || booking.status === 'confirmed';
    if (active && new Date(booking.start).getTime() > nowMs) upcoming.push(booking);
    else past.push(booking);
  }
  upcoming.sort((a, b) => a.start.localeCompare(b.start));
  past.sort((a, b) => b.start.localeCompare(a.start));
  return { upcoming, past };
}

/** The client has to confirm pending bookings the master created (ТЗ 6.4, 8.2). */
export function needsClientConfirmation(booking: BookingView): boolean {
  return booking.status === 'pending' && booking.createdBy === 'master';
}

/** Booking flow on the master profile, preselecting the same service. */
export function bookAgainUrl(booking: Pick<BookingView, 'masterId' | 'subcategoryId'>): string {
  return `/masters/${booking.masterId}?book=1&service=${booking.subcategoryId}`;
}
