import { TestBed } from '@angular/core/testing';
import { groupServices } from '../../state/profile-helpers';
import { ServiceList } from './service-list';

describe('ServiceList', () => {
  const groups = groupServices(
    [
      {
        id: '1',
        subcategoryId: 'manicure-gel',
        price: { kind: 'from', amount: 30 },
        durationMin: 90,
      },
      { id: '2', subcategoryId: 'pedicure-spa', price: { kind: 'free' }, durationMin: 60 },
    ],
    ['manicure', 'pedicure'],
  );

  async function render(bookable = true) {
    const fixture = TestBed.createComponent(ServiceList);
    fixture.componentRef.setInput('groups', groups);
    fixture.componentRef.setInput('bookable', bookable);
    await fixture.whenStable();
    return fixture;
  }

  it('renders category headers, durations and prices', async () => {
    const el: HTMLElement = (await render()).nativeElement;
    const headers = [...el.querySelectorAll('h3')].map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Маникюр', 'Педикюр']);
    expect(el.textContent).toContain('Покрытие гель-лаком');
    expect(el.textContent).toMatch(/1\sч 30\sмин/);
    expect(el.textContent).toMatch(/от 30\sр/);
    expect(el.textContent).toContain('Бесплатно');
  });

  it('emits the subcategory to book', async () => {
    const fixture = await render();
    const spy = jest.fn();
    fixture.componentInstance.book.subscribe(spy);
    (fixture.nativeElement.querySelector('.row__book') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith('manicure-gel');
  });

  it('hides booking buttons on the own profile', async () => {
    const el: HTMLElement = (await render(false)).nativeElement;
    expect(el.querySelector('.row__book')).toBeNull();
  });
});
