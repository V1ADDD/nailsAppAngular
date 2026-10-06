import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { type ReviewView } from '@app/core/data/api';
import { SessionStore } from '@app/core/session/session.store';
import { ClientAccountStore } from '../../../state/client-account.store';
import { ReviewsPanel } from './reviews-panel';

const review = (id: string, patch: Partial<ReviewView> = {}) =>
  ({
    id,
    rating: 5,
    text: 'Всё понравилось',
    date: '2026-09-20T10:00:00Z',
    masterName: 'Екатерина Ковалёва',
    clientName: 'Анна Новикова',
    serviceName: 'Маникюр с покрытием',
    ...patch,
  }) as ReviewView;

function setup(
  state: { written?: ReviewView[]; aboutMe?: ReviewView[]; error?: string | null } = {},
) {
  const store = {
    reviews: signal({ written: state.written ?? [], aboutMe: state.aboutMe ?? [] }),
    reviewsLoading: signal(false),
    reviewsError: signal<string | null>(state.error ?? null),
    loadReviews: jest.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ClientAccountStore, useValue: store },
      { provide: SessionStore, useValue: { client: signal({ id: 'c1' }) } },
    ],
  });
  const router = TestBed.inject(Router);
  const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ReviewsPanel);
  const el = fixture.nativeElement as HTMLElement;
  const tabs = () => [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  return { fixture, el, store, navigate, tabs };
}

describe('ReviewsPanel', () => {
  it('opens «Мои отзывы» by default with counts on both sub-tabs', async () => {
    const { fixture, el, tabs } = setup({
      written: [review('w1'), review('w2')],
      aboutMe: [review('a1')],
    });
    await fixture.whenStable();
    expect(tabs().map((t) => t.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Мои отзывы 2',
      'Отзывы обо мне 1',
    ]);
    expect(tabs()[0]!.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelectorAll('app-review-card')).toHaveLength(2);
  });

  it('switches to «Отзывы обо мне» and keeps it in ?sub=about', async () => {
    const { fixture, el, tabs, navigate } = setup({
      written: [review('w1')],
      aboutMe: [review('a1'), review('a2'), review('a3')],
    });
    await fixture.whenStable();
    tabs()[1]!.click();
    await fixture.whenStable();
    expect(el.querySelectorAll('app-review-card')).toHaveLength(3);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { sub: 'about' }, replaceUrl: true }),
    );
  });

  it('restores the sub-tab from the query param and shows its own empty state', async () => {
    const { fixture, el, tabs } = setup({ written: [review('w1')] });
    fixture.componentRef.setInput('sub', 'about');
    await fixture.whenStable();
    expect(tabs()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelector('app-review-card')).toBeNull();
    expect(el.textContent).toContain('Отзывов о вас пока нет');
  });

  it('shows the empty state for «Мои отзывы»', async () => {
    const { fixture, el } = setup();
    await fixture.whenStable();
    expect(el.textContent).toContain('Вы пока не оставляли отзывов');
  });

  it('shows an error with retry', async () => {
    const { fixture, el, store } = setup({ error: 'Сеть недоступна' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Сеть недоступна');
    el.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    expect(store.loadReviews).toHaveBeenCalledWith('c1');
  });
});
