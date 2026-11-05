import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { CartService } from '../store/cart.service';
import { CartSummary } from '../store/store.models';
import { adminPassword, customerPassword, passwordsMatch } from './account-forms';
import { safeReturnUrl } from './account.guards';
import { Customer } from './account.models';
import { CustomerAuthService } from './customer-auth.service';

const money = (piastres: number) => ({ amount_piastres: piastres, currency: 'EGP' });
const line = (variant_id: number, quantity: number): CartSummary['items'][number] => ({
  variant_id,
  quantity,
  sku: `SKU-${variant_id}`,
  product: null,
  variant_name: { en: '400 g', ar: '400 جم' },
  unit_price: money(50000),
  line_total: money(50000 * quantity),
  is_available: true,
  max_quantity: 10,
  exceeds_available_quantity: false,
});
const cartOf = (...lines: CartSummary['items']): CartSummary => ({
  items: lines,
  subtotal: money(lines.reduce((t, l) => t + 50000 * l.quantity, 0)),
  item_count: lines.reduce((t, l) => t + l.quantity, 0),
  has_unavailable_items: false,
});
const mona: Customer = {
  id: 7,
  first_name: 'Mona',
  last_name: 'Hassan',
  email: 'mona@example.com',
  phone: null,
  locale: 'en',
  email_verified: false,
  created_at: null,
};

describe('CustomerAuthService and the account cart', () => {
  let http: HttpTestingController;
  let auth: CustomerAuthService;
  let cart: CartService;

  beforeEach(() => {
    localStorage.removeItem('jovie.cart');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(CustomerAuthService);
    cart = TestBed.inject(CartService);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.cart');
  });

  const signIn = () => {
    auth.login('mona@example.com', 'goatmilk2026', false).subscribe();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    http.expectOne('/api/v1/customer/auth/login').flush({ data: mona });
  };

  it('restores a guest after a refresh when there is no session', () => {
    auth.restore().subscribe();
    http.expectOne('/api/v1/customer/me').flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.status()).toBe('guest');
    expect(cart.mode()).toBe('guest');
  });

  it('restores a signed-in customer after a refresh and loads the account cart', () => {
    auth.restore().subscribe();
    http.expectOne('/api/v1/customer/me').flush({ data: mona });
    http.expectOne('/api/v1/customer/cart').flush({ data: cartOf(line(1, 2)) });
    expect(auth.customer()?.first_name).toBe('Mona');
    expect(cart.mode()).toBe('customer');
    expect(cart.count()).toBe(2);
  });

  it('merges the guest cart on sign-in and only then empties the browser copy', () => {
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 2 }]));
    // The service was created before the test put the cart in storage: give it the same lines.
    (cart as unknown as { stored: { set: (v: unknown) => void } }).stored.set([{ variant_id: 1, quantity: 2 }]);

    signIn();
    const merge = http.expectOne('/api/v1/customer/cart/merge');
    expect(merge.request.body).toEqual({ items: [{ variant_id: 1, quantity: 2 }] });
    expect(JSON.parse(localStorage.getItem('jovie.cart')!)).toEqual([{ variant_id: 1, quantity: 2 }]);
    merge.flush({ data: cartOf(line(1, 3), line(2, 1)) });

    expect(JSON.parse(localStorage.getItem('jovie.cart')!)).toEqual([]);
    expect(cart.count()).toBe(4);
  });

  it('keeps the guest cart when the merge fails, and tries again on the next refresh', () => {
    (cart as unknown as { stored: { set: (v: unknown) => void } }).stored.set([{ variant_id: 1, quantity: 2 }]);
    localStorage.setItem('jovie.cart', JSON.stringify([{ variant_id: 1, quantity: 2 }]));

    signIn();
    http.expectOne('/api/v1/customer/cart/merge').flush({ message: 'Server Error' }, { status: 500, statusText: 'Server Error' });
    expect(cart.lines()).toEqual([{ variant_id: 1, quantity: 2 }]);
    expect(cart.count()).toBe(2);

    cart.refresh().subscribe();
    http.expectOne('/api/v1/customer/cart/merge').flush({ data: cartOf(line(1, 2)) });
    expect(cart.lines()).toEqual([]);
    expect(cart.count()).toBe(2);
  });

  it('sends the merge once even when the cart page refreshes during sign-in', () => {
    (cart as unknown as { stored: { set: (v: unknown) => void } }).stored.set([{ variant_id: 1, quantity: 2 }]);

    signIn();
    cart.refresh().subscribe();
    cart.refresh().subscribe();
    const merges = http.match('/api/v1/customer/cart/merge');
    expect(merges.length).toBe(1);
    merges[0].flush({ data: cartOf(line(1, 2)) });
    expect(cart.count()).toBe(2);

    // Once merged, a refresh reads the account cart instead of merging again.
    cart.refresh().subscribe();
    http.expectOne('/api/v1/customer/cart').flush({ data: cartOf(line(1, 2)) });
  });

  it('adds to the account cart on the server, capped at what can be bought', () => {
    signIn();
    http.expectOne('/api/v1/customer/cart').flush({ data: cartOf(line(1, 9)) });

    let allowed = 0;
    cart.add(1, 5).subscribe(({ adjustments }) => (allowed = adjustments[0]?.allowed ?? 0));
    const put = http.expectOne('/api/v1/customer/cart/items/1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ quantity: 10 });
    put.flush({ data: cartOf(line(1, 10)) });
    expect(allowed).toBe(10);
    expect(cart.count()).toBe(10);
  });

  it('falls back to the browser cart when the session has ended', () => {
    signIn();
    http.expectOne('/api/v1/customer/cart').flush({ data: cartOf(line(1, 1)) });

    cart.refresh().subscribe({ error: () => undefined });
    http.expectOne('/api/v1/customer/cart').flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.status()).toBe('guest');
    expect(auth.expired()).toBeTrue();
    expect(cart.mode()).toBe('guest');
  });

  it('logs out locally even when the server cannot be reached', () => {
    signIn();
    http.expectOne('/api/v1/customer/cart').flush({ data: cartOf() });
    auth.logout().subscribe();
    http.expectOne('/api/v1/customer/auth/logout').error(new ProgressEvent('error'));
    expect(auth.status()).toBe('guest');
    expect(auth.expired()).toBeFalse();
    expect(cart.mode()).toBe('guest');
  });
});

describe('account helpers', () => {
  it('only returns to pages of the store after signing in', () => {
    expect(safeReturnUrl('/jovie/checkout')).toBe('/jovie/checkout');
    expect(safeReturnUrl('/jovie/shop/x?y=1')).toBe('/jovie/shop/x?y=1');
    expect(safeReturnUrl('https://evil.example')).toBe('/jovie/account');
    expect(safeReturnUrl('//evil.example/jovie')).toBe('/jovie/account');
    expect(safeReturnUrl('/admin')).toBe('/jovie/account');
    expect(safeReturnUrl('/jovie/login?returnUrl=/x')).toBe('/jovie/account');
    expect(safeReturnUrl(null)).toBe('/jovie/account');
  });

  it('checks the customer and admin password policies of the API', () => {
    const customer = (v: string) => customerPassword(new FormControl(v));
    expect(customer('goatmilk2026')).toBeNull();
    expect(customer('goatmilk')).toEqual({ passwordRule: true });
    expect(customer('12345678')).toEqual({ passwordRule: true });
    expect(customer('short1')).toEqual({ passwordRule: true });

    const admin = (v: string) => adminPassword(new FormControl(v));
    expect(admin('Strong-Password-1')).toBeNull();
    expect(admin('strong-password-1')).toEqual({ passwordRule: true });
    expect(admin('Short-1')).toEqual({ passwordRule: true });
  });

  it('marks a confirmation that does not match the password', () => {
    const form = new FormGroup(
      { password: new FormControl('goatmilk2026'), password_confirmation: new FormControl('goatmilk2027') },
      { validators: passwordsMatch },
    );
    expect(form.controls.password_confirmation.hasError('mismatch')).toBeTrue();
    form.controls.password_confirmation.setValue('goatmilk2026');
    expect(form.controls.password_confirmation.hasError('mismatch')).toBeFalse();
  });
});
