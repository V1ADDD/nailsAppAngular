import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Master } from '@app/core/data/models';
import { type MasterResult } from '../../state/search-logic';
import { MasterCard } from './master-card';

const master = {
  id: 'm-anna',
  name: 'Анна Серова',
  photoUrl: null,
  specialty: 'Мастер ногтей',
  rating: 4.9,
  reviewsCount: 214,
  experienceYears: 5,
  verification: 'verified',
  online: true,
} as Master;

function result(patch: Partial<MasterResult> = {}): MasterResult {
  return {
    master,
    distanceKm: 1.24,
    relevantServices: [
      {
        id: 's1',
        subcategoryId: 'manicure-hardware',
        price: { kind: 'exact', amount: 35 },
        durationMin: 60,
      },
      {
        id: 's2',
        subcategoryId: 'manicure-gel',
        price: { kind: 'from', amount: 40 },
        durationMin: 90,
      },
    ],
    narrowed: false,
    minPrice: { kind: 'from', amount: 35 },
    score: 2,
    nextFreeSlot: null,
    ...patch,
  };
}

async function setup(r: MasterResult, own = false) {
  TestBed.configureTestingModule({ imports: [MasterCard], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(MasterCard);
  fixture.componentRef.setInput('result', r);
  fixture.componentRef.setInput('own', own);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, text: () => (el.textContent ?? '').replace(/\s+/g, ' ') };
}

describe('MasterCard', () => {
  it('shows the relevant info: name, verified badge, experience, distance, min price', async () => {
    const { el, text } = await setup(result());
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/masters/m-anna');
    expect(el.querySelector('[aria-label="Проверенный мастер"]')).not.toBeNull();
    expect(text()).toContain('Опыт 5 лет');
    expect(text()).toContain('1,2 км');
    expect(text()).toContain('от 35 р');
    expect(text()).toContain('Все услуги: 2 услуги');
  });

  it('expands the service group to list subcategories with prices', async () => {
    const { fixture, el, text } = await setup(result());
    expect(el.querySelector('.mc__services')).toBeNull();
    (el.querySelector('.mc__group') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(text()).toContain('Аппаратный маникюр');
    expect(text()).toContain('Покрытие гель-лаком');
  });

  it('emits the matched subcategory on «Записаться» when the match is unambiguous', async () => {
    const narrowed = result({
      narrowed: true,
      relevantServices: [result().relevantServices[1]!],
      minPrice: { kind: 'from', amount: 40 },
    });
    const { fixture, el } = await setup(narrowed);
    const booked = jest.fn();
    fixture.componentInstance.book.subscribe(booked);
    const button = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Записаться'),
    );
    button!.click();
    expect(booked).toHaveBeenCalledWith('manicure-gel');
  });

  it('hides booking and messaging on the user own profile', async () => {
    const { text } = await setup(result(), true);
    expect(text()).not.toContain('Записаться');
    expect(text()).not.toContain('Написать');
    expect(text()).toContain('Это ваш профиль');
  });
});
