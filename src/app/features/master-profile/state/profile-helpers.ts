import { categoryOf, findCategory } from '@app/core/data/catalog';
import { type MasterService, type Slot } from '@app/core/data/models';
import { addDays, dayKey } from '@app/shared/format/dates';
import { plural, type WordForms } from '@app/shared/format/plural';
import { NBSP } from '@app/shared/format/text';

/** «45 мин», «1 ч», «1 ч 30 мин». */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}${NBSP}мин`;
  return m === 0 ? `${h}${NBSP}ч` : `${h}${NBSP}ч ${m}${NBSP}мин`;
}

export interface SlotDay {
  /** Minsk day key, 'yyyy-MM-dd'. */
  key: string;
  /** Start of the first slot of the day (for relativeDay display). */
  date: string;
  slots: Slot[];
}

/** Slots grouped by Minsk calendar day, in chronological order. */
export function groupSlotsByDay(slots: readonly Slot[]): SlotDay[] {
  const days = new Map<string, SlotDay>();
  for (const slot of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = dayKey(slot.start);
    const day = days.get(key) ?? { key, date: slot.start, slots: [] };
    day.slots.push(slot);
    days.set(key, day);
  }
  return [...days.values()];
}

export interface DayOption {
  key: string;
  date: Date;
  free: number;
}

/** The next `count` days starting today, with the number of free slots in each. */
export function buildDayOptions(slots: readonly Slot[], now: Date, count = 14): DayOption[] {
  const free = new Map<string, number>();
  for (const s of slots) {
    if (s.status !== 'free') continue;
    const key = dayKey(s.start);
    free.set(key, (free.get(key) ?? 0) + 1);
  }
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(now, i);
    const key = dayKey(date);
    return { key, date, free: free.get(key) ?? 0 };
  });
}

export interface ServiceGroup {
  categoryId: string;
  name: string;
  services: MasterService[];
}

/** ТЗ 4.2: services grouped by catalog category, in the master's category order. */
export function groupServices(
  services: readonly MasterService[],
  categoryOrder: readonly string[] = [],
): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>();
  for (const id of categoryOrder) {
    const category = findCategory(id);
    if (category) groups.set(id, { categoryId: id, name: category.name, services: [] });
  }
  for (const service of services) {
    const category = categoryOf(service.subcategoryId);
    const id = category?.id ?? 'other';
    const group = groups.get(id) ?? {
      categoryId: id,
      name: category?.name ?? 'Другое',
      services: [],
    };
    group.services.push(service);
    groups.set(id, group);
  }
  return [...groups.values()].filter((g) => g.services.length > 0);
}

/** Word forms for PluralPipe. */
export const YEAR_FORMS: WordForms = ['год', 'года', 'лет'];
export const REVIEW_FORMS: WordForms = ['отзыв', 'отзыва', 'отзывов'];
export const SLOT_FORMS: WordForms = ['окно', 'окна', 'окон'];
export const PHOTO_FORMS: WordForms = ['фото', 'фото', 'фото'];

/** ТЗ 1.2: «обычно отвечает за 15 минут», «за час», «за 2 часа». */
export function replyTimeText(minutes: number): string {
  if (minutes < 60) {
    const text = minutes === 1 ? 'минуту' : plural(minutes, ['минуту', 'минуты', 'минут']);
    return `обычно отвечает за ${text}`;
  }
  const hours = Math.round(minutes / 60);
  return `обычно отвечает за ${hours === 1 ? 'час' : plural(hours, ['час', 'часа', 'часов'])}`;
}
