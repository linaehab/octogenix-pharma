import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { JOVIE_PREVIEW_PRODUCTS } from '../../data/jovie-catalog.service';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { jovieTranslations } from '../../jovie-translations';
import { ShopSection } from './shop-section';

describe('ShopSection', () => {
  let http: HttpTestingController;

  const render = (preview = PREVIEW_PRODUCTS) => {
    TestBed.configureTestingModule({
      imports: [ShopSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: JOVIE_PREVIEW_PRODUCTS, useValue: preview }],
    });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(ShopSection);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const flush = (body: object | string, init?: { status: number; statusText: string }) =>
    http.expectOne((req) => req.url === '/api/v1/products').flush(body, init);

  afterEach(() => http.verify());

  it('shows skeleton cards while loading', () => {
    const { element } = render();

    expect(element.querySelectorAll('.skeleton').length).toBe(3);
    flush({ data: [] });
  });

  it('shows the three preview products like the kabrita.eu cards, with labelled prices', () => {
    const { fixture, element } = render();
    flush({ data: [] });
    fixture.detectChanges();

    const cards = Array.from(element.querySelectorAll<HTMLElement>('app-product-card'));
    expect(cards.length).toBe(3);
    expect(cards[0].querySelector('.price')?.textContent).toContain('From');
    expect(cards[0].textContent).toContain('EGP');
    expect(cards[0].textContent).toContain('Preview price and rating for display only');
    expect(cards[0].querySelector('.stars')?.getAttribute('aria-label')).toBe('Rated 4.5 out of 5');
    expect(cards[0].querySelectorAll('.stars svg').length).toBe(5);
    expect(cards[0].querySelector('.rating')?.textContent).toContain('172 reviews');
    expect(Array.from(cards[0].querySelectorAll('.chips li')).map((li) => li.textContent?.trim())).toEqual([
      '0–6 months',
      '1 Jovie tin (400 g)',
    ]);
    expect(cards[2].querySelector('.chips li')?.textContent?.trim()).toBe('1–3 years');
    expect(cards.map((card) => card.querySelector('.main')?.getAttribute('src'))).toEqual(
      [1, 2, 3].map((stage) => `/assets/images/jovie/products/eg-stage-${stage}-front.webp`),
    );
    expect(cards.map((card) => card.querySelector('.duo')?.getAttribute('src'))).toEqual(
      [1, 2, 3].map((stage) => `/assets/images/jovie/products/eg-stage-${stage}-duo.webp`),
    );
    expect(cards.map((card) => card.querySelector('a.shop-now')?.getAttribute('href'))).toEqual([
      '/jovie/products/infant-goat-milk',
      '/jovie/products/follow-on-goat-milk',
      '/jovie/products/toddler-goat-milk',
    ]);
    expect(element.querySelector('app-product-card button')).toBeNull();
  });

  it('shows real API products without the preview label', () => {
    const { fixture, element } = render();
    flush({ data: [{ ...PREVIEW_PRODUCTS[1], price_from: null, rating: undefined }] });
    fixture.detectChanges();

    expect(element.querySelectorAll('app-product-card').length).toBe(1);
    expect(element.textContent).toContain('Price coming soon');
    expect(element.textContent).not.toContain('Preview price');
    expect(element.querySelector('.rating')).toBeNull();
  });

  it('shows an error with a retry button', () => {
    const { fixture, element } = render();
    flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('could not load');
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.skeleton').length).toBe(3);
    flush({ data: [] });
  });

  it('shows the empty state when there are no products to show', () => {
    const { fixture, element } = render([]);
    flush({ data: [] });
    fixture.detectChanges();

    expect(element.textContent).toContain('Jovie products will be available here soon.');
  });
});
