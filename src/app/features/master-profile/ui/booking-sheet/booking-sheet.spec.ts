import { TestBed } from '@angular/core/testing';
import { type Master } from '@app/core/data/models';
import { type BookingWizard } from '../../state/master-profile.store';
import { BookingSheet } from './booking-sheet';

const master = {
  id: 'm1',
  name: 'Анна Серова',
  address: 'ул. Ленина, 42',
  services: [
    {
      id: 's1',
      subcategoryId: 'manicure-gel',
      price: { kind: 'exact', amount: 45 },
      durationMin: 90,
    },
    {
      id: 's2',
      subcategoryId: 'manicure-french',
      price: { kind: 'exact', amount: 50 },
      durationMin: 60,
    },
    {
      id: 's3',
      subcategoryId: 'pedicure-spa',
      price: { kind: 'from', amount: 60 },
      durationMin: 90,
    },
  ],
} as unknown as Master;

const wizard = (patch: Partial<BookingWizard> = {}): BookingWizard => ({
  open: true,
  clientId: 'c1',
  subcategoryId: null,
  focusSubcategoryId: null,
  day: null,
  slotId: null,
  conflicts: null,
  checking: false,
  submitting: false,
  error: null,
  ...patch,
});

async function render(w: BookingWizard) {
  const fixture = TestBed.createComponent(BookingSheet);
  fixture.componentRef.setInput('master', master);
  fixture.componentRef.setInput('wizard', w);
  fixture.componentRef.setInput('days', []);
  fixture.componentRef.setInput('daySlots', []);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const radios = () => [...el.querySelectorAll<HTMLInputElement>('input[name="service"]')];
  const toggle = () => el.querySelector<HTMLButtonElement>('.more');
  return { fixture, el, radios, toggle };
}

describe('BookingSheet service step', () => {
  it('lists every service when nothing was preselected', async () => {
    const { radios, toggle } = await render(wizard());
    expect(radios().map((r) => r.value)).toEqual([
      'manicure-gel',
      'manicure-french',
      'pedicure-spa',
    ]);
    expect(toggle()).toBeNull();
  });

  it('shows only the preselected service and folds the others', async () => {
    const { fixture, radios, toggle } = await render(
      wizard({ subcategoryId: 'manicure-french', focusSubcategoryId: 'manicure-french' }),
    );
    expect(radios().map((r) => r.value)).toEqual(['manicure-french']);
    expect(radios()[0]!.checked).toBe(true);
    expect(toggle()!.textContent).toContain('Другие услуги (2)');
    expect(toggle()!.getAttribute('aria-expanded')).toBe('false');

    toggle()!.click();
    await fixture.whenStable();
    expect(radios().map((r) => r.value)).toEqual([
      'manicure-gel',
      'manicure-french',
      'pedicure-spa',
    ]);
    expect(radios().find((r) => r.checked)?.value).toBe('manicure-french');
    expect(toggle()!.getAttribute('aria-expanded')).toBe('true');
    expect(toggle()!.textContent).toContain('Скрыть другие услуги');
  });

  it('lets the client switch to another service after expanding', async () => {
    const { fixture, radios, toggle } = await render(
      wizard({ subcategoryId: 'manicure-french', focusSubcategoryId: 'manicure-french' }),
    );
    const picked: string[] = [];
    fixture.componentInstance.serviceChange.subscribe((id) => picked.push(id));
    toggle()!.click();
    await fixture.whenStable();
    radios()[2]!.click();
    expect(picked).toEqual(['pedicure-spa']);
  });

  it('folds again when the sheet is reopened', async () => {
    const focused = wizard({ subcategoryId: 'manicure-gel', focusSubcategoryId: 'manicure-gel' });
    const { fixture, radios, toggle } = await render(focused);
    toggle()!.click();
    await fixture.whenStable();
    expect(radios()).toHaveLength(3);

    fixture.componentRef.setInput('wizard', { ...focused, open: false });
    await fixture.whenStable();
    fixture.componentRef.setInput('wizard', focused);
    await fixture.whenStable();
    expect(radios().map((r) => r.value)).toEqual(['manicure-gel']);
  });
});
