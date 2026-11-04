import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { JOVIE_PREVIEW_PRODUCTS } from '../../data/jovie-catalog.service';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { SiteContentService } from '../../../core/content/site-content.service';
import { jovieTranslations } from '../../jovie-translations';
import { CartService } from '../../store/cart.service';
import { ShopSection } from './shop-section';

describe('ShopSection', () => {
  let http: HttpTestingController;

  const render = (preview = PREVIEW_PRODUCTS, storeOpen = false) => {
    TestBed.configureTestingModule({
      imports: [ShopSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: JOVIE_PREVIEW_PRODUCTS, useValue: preview }],
    });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    if (storeOpen) {
      // The published store switch (GET /api/v1/settings): orders open.
      const content = TestBed.inject(SiteContentService);
      spyOn(content, 'setting').and.callFake(((key: string, fallback: unknown) => (key === 'store.enabled' ? true : fallback)) as never);
    }
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
    // Preview products have no real variant: Add to Cart stays off.
    const add = cards[0].querySelector<HTMLButtonElement>('button.add');
    expect(add?.disabled).toBeTrue();
    expect(add?.textContent?.trim()).toBe('Available soon');
  });

  it('shows real API products without the preview label', () => {
    const { fixture, element } = render();
    const variant = { ...PREVIEW_PRODUCTS[1].variants[0], id: 2, price: null, is_available: false };
    flush({ data: [{ ...PREVIEW_PRODUCTS[1], price_from: null, rating: undefined, variants: [variant] }] });
    fixture.detectChanges();

    expect(element.querySelectorAll('app-product-card').length).toBe(1);
    expect(element.textContent).toContain('Price coming soon');
    expect(element.textContent).not.toContain('Preview price');
    // No reviews in the API yet: the stage's placeholder rating, labelled as a preview.
    expect(element.querySelector('.rating')?.textContent).toContain('206 reviews');
    expect(element.querySelector('.preview-note')?.textContent).toContain('Preview rating for display only');
  });

  /** A product as the API sends it once the admin has a price and stock (test values). */
  const sellable = (stage = 1) => {
    const product = PREVIEW_PRODUCTS[stage - 1];
    const price = { amount_piastres: 50000, currency: 'EGP' };
    return { ...product, rating: undefined, price_from: price, is_available: true, variants: [{ ...product.variants[0], id: stage, price, is_available: true }] };
  };

  it('adds the chosen product to the cart, priced by the server', () => {
    const { fixture, element } = render(PREVIEW_PRODUCTS, true);
    flush({ data: [sellable(1)] });
    fixture.detectChanges();

    const card = element.querySelector<HTMLElement>('app-product-card')!;
    expect(card.querySelector('.price')?.textContent).toContain('500');
    // Two separate actions: Add to Cart stays here, Shop now opens the shop product page.
    expect(card.querySelector('a.shop-now')?.getAttribute('href')).toBe(`/jovie/shop/${sellable(1).slug}`);
    const add = card.querySelector<HTMLButtonElement>('button.add')!;
    expect(add.disabled).toBeFalse();
    expect(add.textContent?.trim()).toBe('Add to cart');

    add.click();
    fixture.detectChanges();
    expect(add.textContent).toContain('Adding');

    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const preview = http.expectOne('/api/v1/cart/preview');
    expect(preview.request.body).toEqual({ items: [{ variant_id: 1, quantity: 1 }] });
    preview.flush({ data: { items: [{ variant_id: 1, quantity: 1, is_available: true, max_quantity: 10, exceeds_available_quantity: false }], subtotal: { amount_piastres: 50000, currency: 'EGP' }, item_count: 1, has_unavailable_items: false } });
    fixture.detectChanges();

    expect(TestBed.inject(CartService).count()).toBe(1);
    expect(card.querySelector('.cart-status')?.textContent).toContain('Added to your cart.');
    expect(card.querySelector('.cart-status a')?.getAttribute('href')).toBe('/jovie/cart');
    localStorage.removeItem('jovie.cart');
  });

  it('lowers the quantity to what the server allows', () => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 3 }]));
    const { fixture, element } = render(PREVIEW_PRODUCTS, true);
    flush({ data: [sellable(1)] });
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('app-product-card button.add')!.click();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const line = { variant_id: 1, is_available: true, max_quantity: 3, exceeds_available_quantity: true };
    http.expectOne('/api/v1/cart/preview').flush({ data: { items: [{ ...line, quantity: 4 }], subtotal: { amount_piastres: 0, currency: 'EGP' }, item_count: 0, has_unavailable_items: true } });
    const corrected = http.expectOne('/api/v1/cart/preview');
    expect(corrected.request.body).toEqual({ items: [{ variant_id: 1, quantity: 3 }] });
    corrected.flush({ data: { items: [{ ...line, quantity: 3, exceeds_available_quantity: false }], subtotal: { amount_piastres: 150000, currency: 'EGP' }, item_count: 3, has_unavailable_items: false } });
    fixture.detectChanges();

    expect(TestBed.inject(CartService).quantityOf(1)).toBe(3);
    expect(element.querySelector('.cart-status')?.textContent).toContain('Only 3 can be ordered');
    localStorage.removeItem('jovie.cart');
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
