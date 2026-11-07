import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { MovementPage, MovementRow, StockPage, StockRow } from './admin-inventory.models';

const ME = '/api/v1/admin/auth/me';
const INVENTORY = '/api/v1/admin/inventory';
const MOVEMENTS = '/api/v1/admin/inventory/movements';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);

const row = (id: number, o: Partial<StockRow> = {}): StockRow => ({
  variant_id: id, product_id: id, name_en: `Product ${id}`, name_ar: `منتج ${id}`, image_url: '/assets/images/jovie.jpg',
  is_active: true, is_purchasable: true, sku: `SKU-${id}`, stock_quantity: 84, low_stock_threshold: 10, stock_status: 'in_stock',
  last_movement_at: '2026-11-05T10:00:00+00:00', ...o,
});
const stockPage = (data: StockRow[], summary = { tracked: 3, in_stock: 1, low_stock: 1, out_of_stock: 1, without_threshold: 0 }, current = 1, last = 1): StockPage => ({
  data, meta: { current_page: current, last_page: last, total: data.length, summary },
});
const movement = (id: number, o: Partial<MovementRow> = {}): MovementRow => ({
  id, variant_id: 1, sku: 'SKU-1', name_en: 'Product 1', name_ar: 'منتج 1', quantity_change: 24, stock_before: 60, stock_after: 84,
  reason: 'restock', note: 'Shipment 42', order: null, admin: { id: 1, name: 'Lina Admin' }, created_at: '2026-11-05T10:00:00+00:00', ...o,
});
const movementPage = (data: MovementRow[]): MovementPage => ({
  data,
  meta: {
    current_page: 1, last_page: 1, total: data.length,
    options: {
      products: [{ variant_id: 1, sku: 'SKU-1', name_en: 'Product 1', name_ar: 'منتج 1' }, { variant_id: 2, sku: 'SKU-2', name_en: 'Product 2', name_ar: 'منتج 2' }],
      admins: [{ id: 1, name: 'Lina Admin' }],
      reasons: ['initial_stock', 'restock', 'manual_adjustment', 'stock_count_correction', 'write_off', 'order_reserved', 'order_released', 'return_restock'],
    },
  },
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin inventory', () => {
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

  async function open(url: string, who: AdminUser): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
    await navigation;
    await settle();
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) => (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const click = async (selector: string) => {
    (el().querySelector(selector) as HTMLElement).click();
    await settle();
  };
  const type = async (selector: string, value: string) => {
    const input = el().querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await settle();
  };
  const choose = async (selector: string, value: string) => {
    const select = el().querySelector(selector) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  };
  const confirmButton = (index: 0 | 1) => el().querySelectorAll('dialog[open] .adm-dialog-actions button')[index] as HTMLButtonElement;

  async function openList(rows: StockRow[] = [row(1, { stock_quantity: 0, stock_status: 'out_of_stock' }), row(2, { stock_quantity: 3, stock_status: 'low_stock' }), row(3)]) {
    await open('/admin/inventory', storeManager);
    return answer(is('GET', INVENTORY), (r) => r.flush(stockPage(rows)));
  }

  describe('access', () => {
    it('sends admins without inventory.manage to the 403 page, for both pages', async () => {
      const editor = admin('content_editor', ['content.manage', 'messages.view', 'reviews.manage']);
      await open('/admin/inventory', editor);
      expect(router.url).toBe('/admin/forbidden');
      await harness.navigateByUrl('/admin/inventory/movements');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/inventory"]')).toBeNull();
    });

    it('shows Inventory as built in the sidebar for inventory managers', async () => {
      await openList();
      const link = el().querySelector('.adm-side a[href="/admin/inventory"]');
      expect(link).not.toBeNull();
      expect(link?.querySelector('.adm-soon')).toBeNull();
    });
  });

  describe('overview', () => {
    it('shows the summary, alerts and stock rows from the API', async () => {
      await openList();
      const cards = Array.from(el().querySelectorAll('.adm-stat')).map(
        (c) => `${c.querySelector('.adm-stat-label')!.textContent!.trim()}: ${c.querySelector('.adm-stat-value')!.textContent!.trim()}`,
      );
      expect(cards).toEqual(['Products tracked: 3', 'In stock: 1', 'Low stock: 1', 'Out of stock: 1']);
      expect(text('.inv-alert p')).toBe('Attention: 1 out of stock, 1 low on stock.');
      const rows = el().querySelectorAll('.inv-table tbody tr');
      expect(rows.length).toBe(3);
      expect(rows[0].textContent).toContain('Out of stock');
      expect(rows[1].textContent).toContain('Low stock');
      expect(rows[2].textContent!.replace(/\s+/g, ' ')).toContain('SKU-3');
      expect(rows[2].querySelector('.inv-qty')?.textContent).toBe('84');
    });

    it('warns about products without a low-stock level', async () => {
      await open('/admin/inventory', storeManager);
      await answer(is('GET', INVENTORY), (r) =>
        r.flush(stockPage([row(1, { low_stock_threshold: null })], { tracked: 1, in_stock: 1, low_stock: 0, out_of_stock: 0, without_threshold: 1 })),
      );
      expect(el().querySelector('.inv-alert')).toBeNull();
      expect(text('.inv-warning')).toContain('1 product(s) have no low-stock level');
      expect(text('.inv-table tbody tr')).toContain('Not set');
    });

    it('searches and filters by stock status, and the alert links filter too', async () => {
      await openList();
      (el().querySelector('#inv-search') as HTMLInputElement).value = 'sku-2';
      (el().querySelector('form.inv-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const searched = await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(2)])));
      expect(searched.request.params.get('search')).toBe('sku-2');

      await choose('#inv-status', 'low_stock');
      const low = await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([])));
      expect(low.request.params.get('status')).toBe('low_stock');
      expect(text('app-admin-state')).toBe('No product matches these filters.');

      await click('.inv-clear');
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1, { stock_quantity: 0, stock_status: 'out_of_stock' })])));
      await click('.inv-alert .adm-link');
      const out = await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([])));
      expect(out.request.params.get('status')).toBe('out_of_stock');
    });

    it('pages, and shows empty and error states', async () => {
      await open('/admin/inventory', storeManager);
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1)], undefined, 1, 2)));
      await click('.inv-pages button:last-child');
      const second = await answer(is('GET', INVENTORY), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([], { tracked: 0, in_stock: 0, low_stock: 0, out_of_stock: 0, without_threshold: 0 })));
      expect(text('app-admin-state')).toBe('There are no products to track yet.');
    });

    it('works in Arabic, right to left', async () => {
      await openList();
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('h1')).toBe('المخزون');
      expect(el().querySelectorAll('.inv-table tbody tr')[0].textContent).toContain('نفد من المخزون');
      expect(text('.inv-alert p')).toContain('تنبيه');
    });
  });

  describe('stock adjustment', () => {
    it('validates the quantity and the note, and previews the result', async () => {
      await openList([row(1, { stock_quantity: 5 })]);
      await click('.inv-actions button');
      expect(el().querySelector('dialog.inv-dialog[open]')).not.toBeNull();
      expect(text('.inv-dialog-stock')).toBe('Current stock: 5');

      await click('.inv-dialog button[type="submit"]');
      expect(text('#inv-quantity-err')).toBe('Enter a quantity.');

      await click('.inv-direction input[value="decrease"]');
      expect((el().querySelector('#inv-reason') as HTMLSelectElement).value).toBe('write_off');
      await type('#inv-quantity', '6');
      expect(text('#inv-quantity-err')).toBe('Only 5 in stock: the stock cannot go below zero.');
      await type('#inv-quantity', '2.5');
      expect(text('#inv-quantity-err')).toBe('Enter a whole number from 1 to 1,000,000.');
      await type('#inv-quantity', '2');
      expect(text('#inv-quantity-help')).toBe('Stock: 5 → 3');
      expect(text('#inv-note-err')).toBe('A note is required for this reason.');

      await click('.inv-direction input[value="count"]');
      await type('#inv-quantity', '5');
      expect(text('#inv-quantity-err')).toBe('The stock already matches this count.');
      expect(http.match(() => true).length).toBe(0);
    });

    it('asks for confirmation, then records a new shipment with the stock the admin saw', async () => {
      await openList([row(1, { stock_quantity: 84 })]);
      await click('.inv-actions button');
      await type('#inv-quantity', '24');
      await click('.inv-dialog button[type="submit"]');
      expect(text('dialog[open] #adm-dialog-text')).toContain('Add 24 to "Product 1": stock 84 → 108.');

      confirmButton(0).click();
      await settle();
      expect(http.match(() => true).length).toBe(0);

      await click('.inv-dialog button[type="submit"]');
      confirmButton(1).click();
      await settle();
      await csrf();
      const post = await answer(is('POST', '/api/v1/admin/product-variants/1/stock-adjustments'), (r) =>
        r.flush({ data: { movement: {}, variant: { stock_quantity: 108 } } }, { status: 201, statusText: 'Created' }),
      );
      expect(post.request.body).toEqual({ reason: 'restock', note: null, expected_stock: 84, quantity: 24 });
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1, { stock_quantity: 108 })])));
      expect(text('.inv-notice')).toBe('The stock of "Product 1" is now 108.');
      expect(el().querySelector('dialog.inv-dialog[open]')).toBeNull();
    });

    it('sends a correction that removes stock as a negative quantity with its note', async () => {
      await openList([row(1, { stock_quantity: 10 })]);
      await click('.inv-actions button');
      await click('.inv-direction input[value="decrease"]');
      await choose('#inv-reason', 'manual_adjustment');
      await type('#inv-quantity', '3');
      await type('#inv-note', 'Missing after count');
      await click('.inv-dialog button[type="submit"]');
      confirmButton(1).click();
      await settle();
      await csrf();
      const post = await answer(is('POST', '/api/v1/admin/product-variants/1/stock-adjustments'), (r) =>
        r.flush({ data: { movement: {}, variant: { stock_quantity: 7 } } }, { status: 201, statusText: 'Created' }),
      );
      expect(post.request.body).toEqual({ reason: 'manual_adjustment', note: 'Missing after count', expected_stock: 10, quantity: -3 });
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1, { stock_quantity: 7 })])));
    });

    it('explains when the stock changed meanwhile and shows the new figure', async () => {
      await openList([row(1, { stock_quantity: 10 })]);
      await click('.inv-actions button');
      await type('#inv-quantity', '5');
      await click('.inv-dialog button[type="submit"]');
      confirmButton(1).click();
      await settle();
      await csrf();
      await answer(is('POST', '/api/v1/admin/product-variants/1/stock-adjustments'), (r) =>
        r.flush({ message: 'changed', current_stock: 8 }, { status: 409, statusText: 'Conflict' }),
      );
      expect(text('.inv-dialog [role="alert"]')).toContain('The stock changed to 8 meanwhile');
      expect(text('.inv-dialog-stock')).toBe('Current stock: 8');
      expect(text('#inv-quantity-help')).toBe('Stock: 8 → 13');
      expect(el().querySelector('dialog.inv-dialog[open]')).not.toBeNull();
    });
  });

  describe('low-stock level', () => {
    it('validates, saves and clears the level', async () => {
      await openList([row(1, { low_stock_threshold: null, stock_status: 'in_stock' })]);
      await click('.inv-edit');
      const input = el().querySelector('#inv-threshold') as HTMLInputElement;
      expect(input.value).toBe('');
      input.value = '-2';
      await click('dialog[open] button[type="submit"]');
      expect(text('#inv-threshold-err')).toBe('Enter a whole number from 0 to 1,000,000, or leave it empty.');

      input.value = '12';
      await click('dialog[open] button[type="submit"]');
      await csrf();
      const put = await answer(is('PUT', '/api/v1/admin/product-variants/1/low-stock-threshold'), (r) =>
        r.flush({ data: row(1, { low_stock_threshold: 12 }) }),
      );
      expect(put.request.body).toEqual({ low_stock_threshold: 12 });
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1, { low_stock_threshold: 12 })])));
      expect(text('.inv-notice')).toBe('The low-stock level of "Product 1" was saved.');

      await click('.inv-edit');
      (el().querySelector('#inv-threshold') as HTMLInputElement).value = '';
      await click('dialog[open] button[type="submit"]');
      const cleared = await answer(is('PUT', '/api/v1/admin/product-variants/1/low-stock-threshold'), (r) => r.flush({ data: row(1, { low_stock_threshold: null }) }));
      expect(cleared.request.body).toEqual({ low_stock_threshold: null });
      await answer(is('GET', INVENTORY), (r) => r.flush(stockPage([row(1, { low_stock_threshold: null })])));
    });
  });

  describe('history', () => {
    it('lists movements read-only with before and after, type, order and who', async () => {
      await open('/admin/inventory/movements', storeManager);
      await answer(is('GET', MOVEMENTS), (r) =>
        r.flush(movementPage([
          movement(2, { reason: 'order_reserved', quantity_change: -2, stock_before: 86, stock_after: 84, note: null, admin: null, order: { id: 7, order_number: 'JV-261106-00007' } }),
          movement(1),
        ])),
      );
      const rows = el().querySelectorAll('.his-table tbody tr');
      expect(rows.length).toBe(2);
      const first = rows[0].textContent!.replace(/\s+/g, ' ');
      expect(first).toContain('Reserved by an order');
      expect(first).toContain('-2');
      expect(first).toContain('86 → 84');
      expect(first).toContain('JV-261106-00007');
      expect(first).toContain('System');
      expect(rows[1].textContent).toContain('+24');
      expect(rows[1].textContent).toContain('Lina Admin');
      expect(el().querySelectorAll('.his-table button, .his-table input').length).toBe(0);
    });

    it('opens for one product from the inventory list and applies the filters', async () => {
      await open('/admin/inventory/movements?variant_id=2', storeManager);
      const first = await answer(is('GET', MOVEMENTS), (r) => r.flush(movementPage([])));
      expect(first.request.params.get('variant_id')).toBe('2');
      expect((el().querySelector('#his-product') as HTMLSelectElement).value).toBe('2');
      expect(text('app-admin-state')).toBe('No movement matches these filters.');

      (el().querySelector('#his-reason') as HTMLSelectElement).value = 'write_off';
      (el().querySelector('#his-from') as HTMLInputElement).value = '2026-11-01';
      (el().querySelector('#his-to') as HTMLInputElement).value = '2026-11-06';
      (el().querySelector('#his-order') as HTMLInputElement).value = 'JV-1';
      (el().querySelector('form.his-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', MOVEMENTS), (r) => r.flush(movementPage([])));
      expect(filtered.request.params.get('reason')).toBe('write_off');
      expect(filtered.request.params.get('from')).toBe('2026-11-01');
      expect(filtered.request.params.get('to')).toBe('2026-11-06');
      expect(filtered.request.params.get('order')).toBe('JV-1');
      expect(filtered.request.params.get('variant_id')).toBe('2');

      await click('.his-buttons .adm-link');
      const cleared = await answer(is('GET', MOVEMENTS), (r) => r.flush(movementPage([])));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page']);
      expect(text('app-admin-state')).toBe('No stock movements yet.');
    });

    it('shows an error state with a retry, in Arabic too', async () => {
      await open('/admin/inventory/movements', storeManager);
      language.setLanguage('ar');
      await answer(is('GET', MOVEMENTS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('app-admin-state')).toContain('تعذّر تحميل سجل المخزون');
      await click('app-admin-state button');
      await answer(is('GET', MOVEMENTS), (r) => r.flush(movementPage([movement(1)])));
      expect(el().querySelector('.his-table tbody tr')?.textContent).toContain('شحنة جديدة');
    });
  });
});
