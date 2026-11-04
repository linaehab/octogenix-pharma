import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { jovieTranslations } from '../../jovie-translations';
import { ShopReviews } from './shop-reviews';

const SLUG = 'jovie-organic-infant-milk-stage-1';
const URL = `/api/v1/products/${SLUG}/reviews`;

const review = (id: number, rating: number, body = 'Gentle on her tummy and easy to prepare.') => ({
  id,
  author_name: `Parent ${id}`,
  rating,
  title: `Review ${id}`,
  body,
  recommends: rating >= 4,
  is_verified_purchase: id === 1,
  helpful_count: 2,
  not_helpful_count: 0,
  created_at: '2026-11-01T10:00:00+00:00',
});

const summary = { count: 6, average: 4.2, distribution: { 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 }, recommend_percent: 83 };
const page = (data: object[], current = 1, last = 2, total = 6) => ({ data, meta: { current_page: current, last_page: last, total, summary } });

/** Chooses n stars in the form by clicking its star, as a person does. */
const pick = (dialog: Element, stars: number) => dialog.querySelectorAll<HTMLLabelElement>('.stars label')[stars - 1].click();

describe('ShopReviews', () => {
  let http: HttpTestingController;

  const render = () => {
    localStorage.removeItem('jovie.votes');
    TestBed.configureTestingModule({ imports: [ShopReviews], providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(ShopReviews);
    fixture.componentRef.setInput('slug', SLUG);
    fixture.componentRef.setInput('productName', 'Jovie Organic Infant Milk');
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const expectList = (params: Record<string, string>): TestRequest => {
    const req = http.expectOne((r) => r.url === URL);
    for (const [key, value] of Object.entries(params)) {
      expect(req.request.params.get(key)).withContext(key).toBe(value);
    }
    return req;
  };

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.votes');
    localStorage.removeItem('jovie.voter');
  });

  it('shows the summary, distribution and reviews from the API, and loads more', () => {
    const { fixture, element } = render();
    expectList({ sort: 'newest', page: '1' }).flush(page([review(1, 5, 'x'.repeat(400)), review(2, 4)]));
    fixture.detectChanges();

    expect(element.querySelector('.average')?.textContent?.trim()).toBe('4.2');
    expect(element.querySelector('.score')?.textContent).toContain('Based on 6 reviews');
    expect(element.querySelector('.recommend')?.textContent).toContain('83%');
    expect(Array.from(element.querySelectorAll('.bars .count'), (c) => c.textContent?.trim())).toEqual(['50% (3)', '33% (2)', '0% (0)', '17% (1)', '0% (0)']);
    const cards = element.querySelectorAll('app-review-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Verified purchase');
    expect(cards[0].textContent).toContain('Recommends this product');
    expect(element.querySelector('.shown')?.textContent).toContain('Showing 2 of 6 reviews');

    // Read more / Read less on a long review.
    const toggle = cards[0].querySelector<HTMLButtonElement>('.link')!;
    expect(cards[0].querySelector('.body')?.textContent?.length).toBeLessThan(300);
    toggle.click();
    fixture.detectChanges();
    expect(cards[0].querySelector('.body')?.textContent?.length).toBe(400);
    expect(toggle.textContent?.trim()).toBe('Read less');

    element.querySelector<HTMLButtonElement>('.more button')!.click();
    expectList({ page: '2' }).flush(page([review(3, 2)], 2, 2));
    fixture.detectChanges();
    expect(element.querySelectorAll('app-review-card').length).toBe(3);
    expect(element.querySelector('.more')).toBeNull();
  });

  it('sorts and filters through the API', () => {
    const { fixture, element } = render();
    expectList({}).flush(page([review(1, 5)]));
    fixture.detectChanges();

    const select = element.querySelector<HTMLSelectElement>('.toolbar select')!;
    select.value = 'lowest';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expectList({ sort: 'lowest', page: '1' }).flush(page([review(4, 2)]));
    fixture.detectChanges();

    element.querySelectorAll<HTMLButtonElement>('.chips button')[4].click(); // 2 stars
    fixture.detectChanges();
    expectList({ sort: 'lowest', rating: '2' }).flush(page([], 1, 1, 0));
    fixture.detectChanges();
    expect(element.textContent).toContain('No reviews with this rating yet.');
  });

  it('shows the empty state and the Write a review button when there are no reviews', () => {
    const { fixture, element } = render();
    expectList({}).flush({ data: [], meta: { current_page: 1, last_page: 1, total: 0, summary: { count: 0, average: null, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, recommend_percent: null } } });
    fixture.detectChanges();

    expect(element.querySelector('.none')?.textContent).toContain('No reviews yet');
    expect(element.querySelector('.toolbar')).toBeNull();
    expect(element.querySelector('button.write')?.textContent?.trim()).toBe('Write a review');
  });

  it('votes once per review', () => {
    const { fixture, element } = render();
    expectList({}).flush(page([review(1, 5)]));
    fixture.detectChanges();

    const yes = element.querySelector<HTMLButtonElement>('app-review-card footer button')!;
    yes.click();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const vote = http.expectOne('/api/v1/reviews/1/votes');
    expect(vote.request.body.helpful).toBeTrue();
    expect(vote.request.body.voter_token).toMatch(/^[0-9a-f-]{36}$/);
    vote.flush({ data: { ...review(1, 5), helpful_count: 3 } });
    fixture.detectChanges();

    expect(yes.textContent).toContain('(3)');
    expect(yes.disabled).toBeTrue();
    expect(element.querySelector('.vote-status')?.textContent).toContain('Thanks');
  });

  it('validates the review form, then sends it for approval', () => {
    const { fixture, element } = render();
    expectList({}).flush(page([review(1, 5)]));
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;
    dialog.showModal = function () { this.setAttribute('open', ''); };

    element.querySelector<HTMLButtonElement>('button.write')!.click();
    fixture.detectChanges();
    dialog.querySelector<HTMLButtonElement>('button.send')!.click();
    fixture.detectChanges();
    expect(dialog.querySelector('#rv-rating-error')?.textContent).toContain('Choose a rating');
    expect(dialog.querySelector('#rv-name-error')?.textContent).toContain('required');

    const type = (selector: string, value: string) => {
      const input = dialog.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    pick(dialog, 4);
    type('#rv-name', 'Mona');
    type('#rv-title', 'Very good');
    type('#rv-body', 'My baby likes it a lot.');
    fixture.detectChanges();
    dialog.querySelector<HTMLButtonElement>('button.send')!.click();
    fixture.detectChanges();

    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const sent = http.expectOne(URL);
    expect(sent.request.method).toBe('POST');
    expect(sent.request.body).toEqual(jasmine.objectContaining({ name: 'Mona', rating: 4, title: 'Very good', email: null, order_number: null, locale: 'en' }));
    sent.flush({ data: { status: 'pending' } }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();
    expect(dialog.querySelector('.sent')?.textContent).toContain('after our team has checked it');
  });

  it('shows the server errors of the form', () => {
    const { fixture, element } = render();
    expectList({}).flush(page([review(1, 5)]));
    fixture.detectChanges();
    const dialog = element.querySelector('dialog')!;
    dialog.showModal = function () { this.setAttribute('open', ''); };
    element.querySelector<HTMLButtonElement>('button.write')!.click();
    fixture.detectChanges();

    pick(dialog, 5);
    for (const [selector, value] of [['#rv-name', 'Ali'], ['#rv-title', 'Great milk'], ['#rv-body', 'Very gentle formula.'], ['#rv-order', 'JV-1'], ['#rv-order-email', 'ali@example.com']]) {
      const input = dialog.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    dialog.querySelector<HTMLButtonElement>('button.send')!.click();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    http.expectOne(URL).flush({ errors: { order_number: ['Not found'] } }, { status: 422, statusText: 'Unprocessable' });
    fixture.detectChanges();

    expect(dialog.querySelector('#rv-order-error')?.textContent).toContain('could not find an order');
    expect(dialog.querySelector('.form-error')?.textContent).toContain('check the highlighted fields');
  });
});
