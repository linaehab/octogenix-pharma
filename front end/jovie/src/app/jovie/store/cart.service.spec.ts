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
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    cart = TestBed.inject(CartService);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.cart');
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
