import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { Page, ProductDiscountRow, PromoCode } from './admin-discounts.models';
import { cairoInput, wholeNumber } from './discount-format';

const ME = '/api/v1/admin/auth/me';
const PRODUCTS = '/api/v1/admin/discounts/products';
const PROMOS = '/api/v1/admin/promo-codes';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);

const row = (o: Partial<ProductDiscountRow> = {}): ProductDiscountRow => ({
  variant_id: 1, product_id: 1, product: { name: { en: 'Jovie Stage 1', ar: 'جوفي المرحلة 1' }, is_active: true }, sku: 'JOVIE-S1',
  price_piastres: 45000, compare_at_price_piastres: null, effective_price_piastres: 45000, discount: null, state: 'none', ...o,
});
const discounted = (o: Partial<ProductDiscountRow> = {}): ProductDiscountRow =>
  row({ discount: { type: 'percent', value: 10, is_active: true, starts_at: null, ends_at: null }, effective_price_piastres: 40500, state: 'active', ...o });
const page = <T>(data: T[]): Page<T> => ({ data, meta: { current_page: 1, last_page: 1, total: data.length } });
const promo = (o: Partial<PromoCode> = {}): PromoCode => ({
  id: 7, code: 'WELCOME10', description: null, discount_type: 'percent', discount_value: 10, min_order_piastres: 50000, starts_at: null,
  ends_at: null, usage_limit: 100, per_customer_limit: 1, is_active: true, state: 'active', used_count: 3,
  created_at: '2026-11-08T10:00:00+00:00', updated_at: '2026-11-08T10:00:00+00:00', ...o,
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin discounts & promo codes', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let language: LanguageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin', loadChildren: () => import('../admin.routes').then((m) => m.adminRoutes) }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    language = TestBed.inject(LanguageService);
    language.setLanguage('en');
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    language.setLanguage('en');
    http.match((r) => r.url.endsWith('/api/v1/admin/notifications/unread-count')).forEach((r) => r.cancelled || r.flush({ data: { unread_count: 0 } }));
    http.verify();
  });

  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await sleep();
      harness.fixture.detectChanges();
    }
  }

  async function answer(test: (r: TestRequest['request']) => boolean, respond: (r: TestRequest) => void): Promise<TestRequest> {
    for (let i = 0; i < 100; i++) {
      const found = http.match(test);
      if (found.length) {
        found.forEach(respond);
        await settle();
        return found[0];
      }
      await sleep();
    }
    throw new Error('No matching request');
  }

  const is = (method: string, url: string) => (r: TestRequest['request']) => r.method === method && r.url === url;
  const csrf = () => answer(is('GET', '/sanctum/csrf-cookie'), (r) => r.flush(null));

  async function open(url: string, who: AdminUser | null): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => (who ? r.flush({ data: who }) : r.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' })));
    await navigation;
    await settle();
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) => (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const texts = (selector: string) => Array.from(el().querySelectorAll(selector)).map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
  const click = async (selector: string) => {
    (el().querySelector(selector) as HTMLElement).click();
    await settle();
  };
  const type = async (selector: string, value: string) => {
    const input = el().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };
  const rowButton = async (label: string, index = 0) => {
    const buttons = Array.from(el().querySelectorAll('.dsc-table tbody tr .dsc-actions button')) as HTMLButtonElement[];
    buttons.filter((b) => (b.textContent ?? '').trim() === label)[index].click();
    await settle();
  };

  async function openProducts(rows: ProductDiscountRow[], who: AdminUser = storeManager): Promise<void> {
    await open('/admin/discounts', who);
    await answer(is('GET', PRODUCTS), (r) => r.flush(page(rows)));
  }

  describe('access', () => {
    it('opens the product discounts tab for catalogue managers, and the section is no longer "coming soon"', async () => {
      await openProducts([]);
      expect(router.url).toBe('/admin/discounts/products');
      expect(texts('.dsc-tabs a')).toEqual(['Product discounts', 'Promo codes']);
      const side = el().querySelector('.adm-side a[href="/admin/discounts"]');
      expect(side?.classList).toContain('is-active');
      expect(side?.querySelector('.adm-soon')).toBeNull();
      expect(text('.adm-state')).toBe('No products were found.');
    });

    it('sends admins without catalog.manage to the 403 page and hides the link', async () => {
      await open('/admin/discounts/promo-codes', support);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/discounts"]')).toBeNull();
    });

    it('sends signed-out visitors to the admin login', async () => {
      await open('/admin/discounts/products', null);
      expect(router.url).toBe('/admin/login');
    });
  });

  describe('product discounts', () => {
    it('lists regular price, discount, what customers pay, period and status', async () => {
      await openProducts([discounted({ discount: { type: 'percent', value: 10, is_active: true, starts_at: null, ends_at: '2026-12-31T21:59:00+00:00' } }), row({ variant_id: 2, sku: 'JOVIE-S2' })]);
      const first = Array.from(el().querySelectorAll('.dsc-table tbody tr'))[0] as HTMLElement;
      const cells = Array.from(first.querySelectorAll('td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(cells[1]).toBe('EGP 450');
      expect(cells[2]).toBe('10%');
      expect(cells[3]).toBe('EGP 450EGP 405');
      expect((first.querySelector('s.dsc-was')?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe('EGP 450');
      expect(cells[4]).toContain('Until');
      expect(cells[4]).toContain('31 Dec 2026');
      expect(cells[5]).toBe('Active');
      expect(texts('.dsc-table tbody tr:nth-child(2) .dsc-actions button')).toEqual(['Add discount']);
    });

    it('adds a fixed discount in piastres, refusing an amount not below the price without asking the API', async () => {
      await openProducts([row()]);
      await rowButton('Add discount');
      await click('dialog[open] input[value="fixed"]');
      await type('#dsc-pd-value', '450');
      await click('dialog[open] button[type="submit"]');
      expect(text('#dsc-pd-value-err')).toContain('lower than the regular price');
      expect(http.match((r) => r.method === 'PUT').length).toBe(0);

      await type('#dsc-pd-value', '٥٠٫٥');
      expect(text('dialog[open] .set-note')).toContain('Customers pay EGP 399.50 instead of EGP 450.');
      await type('#dsc-pd-ends', '2026-12-31T23:59');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      const put = await answer(is('PUT', '/api/v1/admin/product-variants/1/discount'), (r) =>
        r.flush({ data: row({ discount: { type: 'fixed', value: 5050, is_active: true, starts_at: null, ends_at: '2026-12-31T21:59:00+00:00' }, effective_price_piastres: 39950, state: 'active' }) }),
      );
      expect(put.request.body).toEqual({ type: 'fixed', value: 5050, is_active: true, starts_at: null, ends_at: '2026-12-31T23:59', expected: null });
      expect(text('.dsc-notice')).toBe('The discount for Jovie Stage 1 was saved.');
      expect(el().querySelector('dialog[open]')).toBeNull();
    });

    it('rejects percentages outside 1–99', async () => {
      await openProducts([row()]);
      await rowButton('Add discount');
      for (const value of ['0', '100', '12.5', 'ten']) {
        await type('#dsc-pd-value', value);
        await click('dialog[open] button[type="submit"]');
        expect(text('#dsc-pd-value-err')).toBe('Enter a whole percentage from 1 to 99.');
      }
      expect(http.match((r) => r.method === 'PUT').length).toBe(0);
      await click('dialog[open] .set-dialog-actions button.is-light');
    });

    it('turns a discount off with the values the admin saw, and shows a change made meanwhile', async () => {
      const current = discounted();
      await openProducts([current]);
      await rowButton('Turn off');
      await csrf();
      const put = await answer(is('PUT', '/api/v1/admin/product-variants/1/discount'), (r) =>
        r.flush({ message: 'changed', current: discounted({ discount: { type: 'percent', value: 20, is_active: true, starts_at: null, ends_at: null }, effective_price_piastres: 36000 }) }, { status: 409, statusText: 'Conflict' }),
      );
      expect(put.request.body).toEqual({ ...current.discount!, is_active: false, expected: current.discount });
      expect(text('.dsc-notice')).toContain('changed by someone else');
      expect(texts('.dsc-table tbody td')[2]).toBe('20%');
    });

    it('removes a discount only after confirmation', async () => {
      await openProducts([discounted()]);
      await rowButton('Remove');
      expect(text('dialog[open] h2')).toBe('Remove this discount?');
      await click('dialog[open] .adm-button.is-danger');
      await csrf();
      const del = await answer(is('DELETE', '/api/v1/admin/product-variants/1/discount'), (r) => r.flush({ data: row() }));
      expect(del.request.body).toEqual({ expected: discounted().discount });
      expect(text('.dsc-notice')).toBe('The discount for Jovie Stage 1 was removed.');
      expect(texts('.dsc-table tbody td')[5]).toBe('No discount');
    });

    it('does not offer a discount on a product that shows a compare-at price', async () => {
      await openProducts([row({ compare_at_price_piastres: 50000 })]);
      expect(text('.dsc-blocked')).toContain('original (compare-at) price');
      expect(el().querySelector('.dsc-table .dsc-actions button')).toBeNull();
    });

    it('filters by status through the API', async () => {
      await openProducts([row()]);
      const select = el().querySelector('#dsc-pd-state') as HTMLSelectElement;
      select.value = 'scheduled';
      select.dispatchEvent(new Event('change'));
      const request = await answer((r) => r.url === PRODUCTS && r.params.get('state') === 'scheduled', (r) => r.flush(page([])));
      expect(request.request.params.get('page')).toBe('1');
      expect(text('.adm-state')).toBe('No product matches these filters.');
    });
  });

  describe('promo codes', () => {
    async function openPromos(rows: PromoCode[]): Promise<void> {
      await open('/admin/discounts/promo-codes', storeManager);
      await answer(is('GET', PROMOS), (r) => r.flush(page(rows)));
    }

    it('lists codes with discount, minimum, uses and status', async () => {
      await openPromos([promo(), promo({ id: 8, code: 'FLAT50', discount_type: 'fixed', discount_value: 5000, min_order_piastres: null, usage_limit: null, state: 'expired', is_active: true })]);
      const rows = Array.from(el().querySelectorAll('.dsc-table tbody tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()),
      );
      expect(rows[0].slice(0, 6)).toEqual(['WELCOME10', '10%', 'EGP 500', 'No end date', '3 of 100', 'Active']);
      expect(rows[1][1]).toBe('EGP 50');
      expect(rows[1][4]).toBe('3 · No limit');
      expect(rows[1][5]).toBe('Ended');
      expect(texts('.dsc-table tbody tr:nth-child(2) .dsc-actions button')).toEqual(['Edit'], 'An ended code cannot be switched on again.');
    });

    it('creates a code with amounts in piastres and checks the limits first', async () => {
      await openPromos([]);
      await click('.dsc-head-actions button');
      await type('#dsc-pc-code', 'launch-2026');
      await click('dialog[open] input[value="fixed"]');
      await type('#dsc-pc-value', '75.5');
      await type('#dsc-pc-min', '1,000');
      await type('#dsc-pc-limit', '5');
      await type('#dsc-pc-per', '6');
      await click('dialog[open] button[type="submit"]');
      expect(text('#dsc-pc-per-err')).toBe('The per-customer limit cannot be higher than the total.');
      expect(http.match((r) => r.method === 'POST' && r.url === PROMOS).length).toBe(0);

      await type('#dsc-pc-per', '1');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      const post = await answer(is('POST', PROMOS), (r) => r.flush({ data: promo({ id: 9, code: 'LAUNCH-2026', is_active: false, state: 'inactive' }) }, { status: 201, statusText: 'Created' }));
      expect(post.request.body).toEqual({
        code: 'LAUNCH-2026', description: null, discount_type: 'fixed', discount_value: 7550, min_order_piastres: 100000,
        starts_at: null, ends_at: null, usage_limit: 5, per_customer_limit: 1, is_active: false,
      });
      await answer(is('GET', PROMOS), (r) => r.flush(page([promo({ id: 9, code: 'LAUNCH-2026', is_active: false, state: 'inactive' })])));
      expect(text('.dsc-notice')).toBe('The promo code LAUNCH-2026 was created.');
    });

    it('rejects invalid codes in the form', async () => {
      await openPromos([]);
      await click('.dsc-head-actions button');
      for (const code of ['AB', 'no spaces', 'خصم']) {
        await type('#dsc-pc-code', code);
        await type('#dsc-pc-value', '10');
        await click('dialog[open] button[type="submit"]');
        expect(text('#dsc-pc-code-err')).toContain('3–32 characters');
      }
      expect(http.match((r) => r.method === 'POST').length).toBe(0);
      await click('dialog[open] .set-dialog-actions button.is-light');
    });

    it('edits with fresh usage figures and the time it was last saved', async () => {
      await openPromos([promo()]);
      await rowButton('Edit');
      await answer(is('GET', `${PROMOS}/7`), (r) =>
        r.flush({ data: promo({ usage: { orders_total: 4, orders_released: 1, orders_counted: 3, discount_given_piastres: 15000 } }) }),
      );
      expect(texts('dialog[open] .set-review li')).toEqual(['Orders using it now: 3', 'Cancelled or expired orders: 1', 'Discount given on those orders: EGP 150']);
      await type('#dsc-pc-value', '15');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      const patch = await answer(is('PATCH', `${PROMOS}/7`), (r) => r.flush({ data: promo({ discount_value: 15 }) }));
      expect(patch.request.body.discount_value).toBe(15);
      expect(patch.request.body.expected_updated_at).toBe('2026-11-08T10:00:00+00:00');
      expect(text('.dsc-notice')).toBe('The promo code WELCOME10 was saved.');
      expect(texts('.dsc-table tbody td')[1]).toBe('15%');
    });

    it('switches a code off', async () => {
      await openPromos([promo()]);
      await rowButton('Turn off');
      await csrf();
      const patch = await answer(is('PATCH', `${PROMOS}/7`), (r) => r.flush({ data: promo({ is_active: false, state: 'inactive' }) }));
      expect(patch.request.body).toEqual({ is_active: false, expected_updated_at: '2026-11-08T10:00:00+00:00' });
      expect(text('.dsc-notice')).toBe('The promo code WELCOME10 is off.');
    });

    it('is shown in Arabic, right to left, with codes and amounts kept left to right', async () => {
      language.setLanguage('ar');
      await openPromos([promo()]);
      expect(text('main h1')).toBe('أكواد الخصم');
      expect(document.documentElement.dir).toBe('rtl');
      expect(texts('.dsc-tabs a')).toEqual(['خصومات المنتجات', 'أكواد الخصم']);
      expect(el().querySelector('.dsc-table .dsc-code')?.getAttribute('dir')).toBe('ltr');
      expect(texts('.dsc-table tbody td')[5]).toBe('مفعّل');
    });
  });

  describe('helpers', () => {
    it('shows stored times in Cairo time for the date fields', () => {
      expect(cairoInput('2026-12-31T21:59:00+00:00')).toBe('2026-12-31T23:59');
      expect(cairoInput(null)).toBe('');
    });

    it('reads whole numbers typed with Arabic digits', () => {
      expect(wholeNumber('١٢')).toBe(12);
      expect(wholeNumber('')).toBeNull();
      expect(wholeNumber('1.5')).toBeNaN();
    });
  });
});
