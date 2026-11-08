import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { egyptianMobile } from '../pages/jovie-checkout-page/jovie-checkout-page';
import { CartService } from './cart.service';
import { CartSummary } from './store.models';

const money = (piastres: number) => ({ amount_piastres: piastres, currency: 'EGP' });
const summary = (lines: Partial<CartSummary['items'][number]>[]): CartSummary => ({
  items: lines.map((line) => ({
    sku: 'SKU',
    product: null,
    variant_name: { en: '400 g', ar: '400 جم' },
    unit_price: money(50000),
    line_total: money(50000 * (line.quantity ?? 1)),
    is_available: true,
    max_quantity: 99,
    exceeds_available_quantity: false,
    variant_id: 1,
    quantity: 1,
    ...line,
  })),
  subtotal: money(0),
  item_count: 0,
  has_unavailable_items: false,
});

describe('CartService', () => {
  let http: HttpTestingController;
  let cart: CartService;

  beforeEach(() => {
    localStorage.removeItem('jovie.cart');
    localStorage.removeItem('jovie.promo');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.cart');
    localStorage.removeItem('jovie.promo');
  });

  const answer = (body: CartSummary) => http.expectOne('/api/v1/cart/preview').flush({ data: body });

  it('keeps only variant IDs and quantities in the browser, and adds to an existing line', () => {
    cart.add(1).subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    answer(summary([{ variant_id: 1, quantity: 1 }]));
    cart.add(1).subscribe();
    answer(summary([{ variant_id: 1, quantity: 2 }]));

    expect(JSON.parse(localStorage.getItem('jovie.cart')!)).toEqual([{ variant_id: 1, quantity: 2 }]);
    expect(cart.count()).toBe(2);
    expect(cart.summary()?.items[0].line_total).toEqual(money(100000));
  });

  it('drops lines the server no longer knows', () => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 1 }, { variant_id: 9, quantity: 2 }]));
    cart = TestBed.runInInjectionContext(() => new CartService());

    cart.refresh().subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    answer(summary([{ variant_id: 1 }]));
    answer(summary([{ variant_id: 1 }]));

    expect(cart.lines()).toEqual([{ variant_id: 1, quantity: 1 }]);
  });

  it('ignores tampered browser data', () => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: -1, quantity: 2 }, { variant_id: 'x', quantity: 1 }, { variant_id: 4, quantity: 1.5 }]));
    cart = TestBed.runInInjectionContext(() => new CartService());

    expect(cart.lines()).toEqual([]);
  });

  it('removes a line and clears after an order', () => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 1 }, { variant_id: 2, quantity: 1 }]));
    cart = TestBed.runInInjectionContext(() => new CartService());

    cart.remove(2).subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    answer(summary([{ variant_id: 1 }]));
    expect(cart.lines()).toEqual([{ variant_id: 1, quantity: 1 }]);

    cart.clear();
    expect(cart.isEmpty()).toBeTrue();
    expect(localStorage.getItem('jovie.cart')).toBe('[]');
  });
});

describe('CartService promo codes', () => {
  let http: HttpTestingController;
  let cart: CartService;

  beforeEach(() => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 2 }]));
    localStorage.removeItem('jovie.promo');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.cart');
    localStorage.removeItem('jovie.promo');
  });

  const priced = (promo: CartSummary['promo'], discount = 0): CartSummary => ({
    ...summary([{ variant_id: 1, quantity: 2 }]),
    subtotal: money(100000),
    discount: money(discount),
    items_total: money(100000 - discount),
    promo,
  });

  it('sends only the typed code; the amount comes from the server and only an applied code goes to checkout', () => {
    cart.applyPromo('  save10 ').subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const request = http.expectOne('/api/v1/cart/preview');
    expect(request.request.body).toEqual({ items: [{ variant_id: 1, quantity: 2 }], promo_code: 'save10' });
    request.flush({ data: priced({ code: 'SAVE10', applied: true, reason: null, discount: money(10000), min_order: null }, 10000) });

    expect(localStorage.getItem('jovie.promo')).toBe('save10');
    expect(cart.summary()?.items_total).toEqual(money(90000));
    expect(cart.appliedPromoCode()).toBe('SAVE10');
  });

  it('keeps a refused code visible with its reason, but never sends it to checkout', () => {
    cart.applyPromo('OLD').subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    http.expectOne('/api/v1/cart/preview').flush({ data: priced({ code: 'OLD', applied: false, reason: 'expired', discount: money(0), min_order: null }) });

    expect(cart.promoCode()).toBe('OLD');
    expect(cart.summary()?.promo?.reason).toBe('expired');
    expect(cart.appliedPromoCode()).toBeNull();
  });

  it('removing the code, or placing the order, forgets it', () => {
    cart.applyPromo('SAVE10').subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    http.expectOne('/api/v1/cart/preview').flush({ data: priced({ code: 'SAVE10', applied: true, reason: null, discount: money(10000), min_order: null }, 10000) });

    cart.removePromo().subscribe();
    const request = http.expectOne('/api/v1/cart/preview');
    expect(request.request.body).toEqual({ items: [{ variant_id: 1, quantity: 2 }] });
    request.flush({ data: priced(null) });
    expect(localStorage.getItem('jovie.promo')).toBeNull();
    expect(cart.appliedPromoCode()).toBeNull();

    cart.applyPromo('SAVE10').subscribe();
    http.expectOne('/api/v1/cart/preview').flush({ data: priced({ code: 'SAVE10', applied: true, reason: null, discount: money(10000), min_order: null }, 10000) });
    cart.clear();
    expect(cart.promoCode()).toBeNull();
    expect(localStorage.getItem('jovie.promo')).toBeNull();
  });

  it('prices a signed-in cart with the code as a query parameter', () => {
    localStorage.setItem('jovie.cart', '[]');
    localStorage.setItem('jovie.promo', 'MINE');
    cart = TestBed.runInInjectionContext(() => new CartService());
    cart.useCustomerCart(() => undefined).subscribe();

    const request = http.expectOne((r) => r.url === '/api/v1/customer/cart');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('promo_code')).toBe('MINE');
    request.flush({ data: priced({ code: 'MINE', applied: false, reason: 'customer_limit', discount: money(0), min_order: null }) });
    expect(cart.appliedPromoCode()).toBeNull();
  });
});

describe('egyptianMobile', () => {
  const check = (value: string) => egyptianMobile(new FormControl(value, { nonNullable: true }));

  it('accepts the formats the server accepts', () => {
    for (const value of ['01012345678', '0111 234 5678', '+201212345678', '00201512345678', '']) {
      expect(check(value)).withContext(value).toBeNull();
    }
  });

  it('refuses other numbers', () => {
    for (const value of ['0123', '01312345678', '0225551234', '+441234567890']) {
      expect(check(value)).withContext(value).toEqual({ phone: true });
    }
  });
});
