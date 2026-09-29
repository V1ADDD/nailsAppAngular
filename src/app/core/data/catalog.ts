import { type ServiceCategory, type ServiceSubcategory } from './models';

/** The single service catalog (ТЗ 4.2). Masters pick subcategories and set a price. */
export const SERVICE_CATALOG: readonly ServiceCategory[] = [
  {
    id: 'manicure',
    name: 'Маникюр',
    specialty: 'Мастер ногтей',
    synonyms: ['ногти', 'ноготочки', 'нейл', 'nail', 'ногтевой сервис'],
    subcategories: [
      { id: 'manicure-classic', categoryId: 'manicure', name: 'Классический маникюр' },
      { id: 'manicure-hardware', categoryId: 'manicure', name: 'Аппаратный маникюр' },
      { id: 'manicure-combined', categoryId: 'manicure', name: 'Комбинированный маникюр' },
      { id: 'manicure-french', categoryId: 'manicure', name: 'Френч' },
      {
        id: 'manicure-gel',
        categoryId: 'manicure',
        name: 'Покрытие гель-лаком',
        synonyms: ['шеллак', 'гель лак', 'гельлак', 'покрытие'],
      },
      { id: 'manicure-design', categoryId: 'manicure', name: 'Дизайн ногтей', addon: true },
      { id: 'manicure-extension', categoryId: 'manicure', name: 'Наращивание ногтей' },
      { id: 'manicure-removal', categoryId: 'manicure', name: 'Снятие покрытия', addon: true },
    ],
  },
  {
    id: 'pedicure',
    name: 'Педикюр',
    specialty: 'Мастер педикюра',
    synonyms: ['стопы', 'ноги'],
    subcategories: [
      { id: 'pedicure-classic', categoryId: 'pedicure', name: 'Классический педикюр' },
      { id: 'pedicure-hardware', categoryId: 'pedicure', name: 'Аппаратный педикюр' },
      { id: 'pedicure-gel', categoryId: 'pedicure', name: 'Педикюр с покрытием' },
      { id: 'pedicure-spa', categoryId: 'pedicure', name: 'SPA-педикюр' },
    ],
  },
  {
    id: 'brows',
    name: 'Брови',
    specialty: 'Бровист',
    synonyms: ['бровки', 'бровист'],
    subcategories: [
      { id: 'brows-correction', categoryId: 'brows', name: 'Коррекция бровей' },
      { id: 'brows-tint', categoryId: 'brows', name: 'Окрашивание бровей' },
      {
        id: 'brows-lamination',
        categoryId: 'brows',
        name: 'Ламинирование бровей',
        synonyms: ['долговременная укладка'],
      },
      { id: 'brows-architecture', categoryId: 'brows', name: 'Архитектура бровей' },
    ],
  },
  {
    id: 'lashes',
    name: 'Ресницы',
    specialty: 'Лешмейкер',
    synonyms: ['реснички', 'лэш', 'лешмейкер', 'lash'],
    subcategories: [
      { id: 'lashes-classic', categoryId: 'lashes', name: 'Наращивание ресниц (классика)' },
      { id: 'lashes-volume', categoryId: 'lashes', name: 'Наращивание ресниц 2D–3D' },
      { id: 'lashes-lamination', categoryId: 'lashes', name: 'Ламинирование ресниц' },
      { id: 'lashes-tint', categoryId: 'lashes', name: 'Окрашивание ресниц' },
    ],
  },
  {
    id: 'cosmetology',
    name: 'Косметология',
    specialty: 'Косметолог',
    synonyms: ['лицо', 'кожа', 'уход'],
    subcategories: [
      { id: 'cosmetology-cleansing', categoryId: 'cosmetology', name: 'Чистка лица' },
      { id: 'cosmetology-peeling', categoryId: 'cosmetology', name: 'Пилинг' },
      { id: 'cosmetology-massage', categoryId: 'cosmetology', name: 'Массаж лица' },
      { id: 'cosmetology-care', categoryId: 'cosmetology', name: 'Уходовая процедура' },
    ],
  },
  {
    id: 'makeup',
    name: 'Макияж',
    specialty: 'Визажист',
    synonyms: ['мейкап', 'make up', 'визаж'],
    subcategories: [
      { id: 'makeup-day', categoryId: 'makeup', name: 'Дневной макияж' },
      { id: 'makeup-evening', categoryId: 'makeup', name: 'Вечерний макияж' },
      { id: 'makeup-wedding', categoryId: 'makeup', name: 'Свадебный макияж' },
    ],
  },
  {
    id: 'depilation',
    name: 'Депиляция',
    specialty: 'Мастер депиляции',
    synonyms: ['эпиляция', 'удаление волос'],
    subcategories: [
      { id: 'depilation-sugaring', categoryId: 'depilation', name: 'Шугаринг' },
      { id: 'depilation-wax', categoryId: 'depilation', name: 'Восковая депиляция' },
    ],
  },
];

const SUBCATEGORY_INDEX = new Map<string, ServiceSubcategory>(
  SERVICE_CATALOG.flatMap((c) => c.subcategories.map((s) => [s.id, s] as const)),
);
const CATEGORY_INDEX = new Map<string, ServiceCategory>(SERVICE_CATALOG.map((c) => [c.id, c]));

export function findSubcategory(id: string): ServiceSubcategory | undefined {
  return SUBCATEGORY_INDEX.get(id);
}

export function findCategory(id: string): ServiceCategory | undefined {
  return CATEGORY_INDEX.get(id);
}

export function subcategoryName(id: string): string {
  return SUBCATEGORY_INDEX.get(id)?.name ?? 'Услуга';
}

export function categoryOf(subcategoryId: string): ServiceCategory | undefined {
  const sub = SUBCATEGORY_INDEX.get(subcategoryId);
  return sub ? CATEGORY_INDEX.get(sub.categoryId) : undefined;
}
