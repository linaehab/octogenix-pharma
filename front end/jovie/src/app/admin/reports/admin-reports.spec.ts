import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { InventoryReport, OrdersReport, ProductReportRow, SalesReport, addDays, cairoToday, daysBetween, presetPeriod } from './admin-reports.models';

const ME = '/api/v1/admin/auth/me';
const R = '/api/v1/admin/reports';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);
const cv = (count: number, value: number) => ({ count, value_piastres: value });
const ca = (count: number, amount: number) => ({ count, amount_piastres: amount });

const sales = (o: Partial<SalesReport> = {}): SalesReport => ({
  period: { from: '2026-11-03', to: '2026-11-04', timezone: 'Africa/Cairo', days: 2, grouping: 'day' },
  currency: 'EGP',
  orders: {
    placed: cv(7, 353000),
    paid: cv(4, 201000),
    by_status: {
      pending_payment: cv(1, 50000), pending_confirmation: cv(0, 0), confirmed: cv(2, 100000), processing: cv(0, 0), shipped: cv(0, 0),
      delivered: cv(2, 102000), cancelled: cv(1, 51000), expired: cv(0, 0), returned: cv(1, 50000),
    },
  },
  payments: { collected: ca(4, 201000), test: ca(1, 50000), refund_review: ca(1, 50000), possible_duplicates: { orders_count: 1, extra_piastres: 50000 } },
  outstanding: { total: cv(2, 101000), card_awaiting_payment: cv(1, 50000), cod_not_collected: cv(1, 51000), cod_delivered_not_collected: cv(1, 51000) },
  by_method: [
    { method: 'card', orders_count: 4, order_value_piastres: 200000, collected_count: 3, collected_piastres: 150000 },
    { method: 'cod', orders_count: 3, order_value_piastres: 153000, collected_count: 1, collected_piastres: 51000 },
  ],
  trend: [
    { period: '2026-11-03', orders_count: 7, order_value_piastres: 353000, collected_piastres: 150000 },
    { period: '2026-11-04', orders_count: 0, order_value_piastres: 0, collected_piastres: 51000 },
  ],
  ...o,
});
const emptySales = () => {
  const s = sales({ trend: [{ period: '2026-11-03', orders_count: 0, order_value_piastres: 0, collected_piastres: 0 }] });
  s.orders.placed = cv(0, 0);
  s.payments = { collected: ca(0, 0), test: ca(0, 0), refund_review: ca(0, 0), possible_duplicates: { orders_count: 0, extra_piastres: 0 } };
  return s;
};
const ordersReport = (rows = 2, page = 1, last = 1): OrdersReport => ({
  data: Array.from({ length: rows }, (_, i) => ({
    order_number: `JV-261103-0000${i + 1}`, placed_at: '2026-11-03T08:00:00+00:00', customer_name: 'Mona Hassan',
    governorate: { en: 'Cairo', ar: 'القاهرة' }, status: i ? 'cancelled' : 'delivered', payment_status: i ? 'unpaid' : 'paid',
    payment_method: 'cod', total_piastres: 51000,
  })),
  meta: {
    current_page: page, last_page: last, total: rows, period: sales().period,
    summary: { count: rows, value_piastres: rows * 51000, paid: cv(1, 51000), outstanding: cv(0, 0) },
  },
});
const product = (o: Partial<ProductReportRow> = {}): ProductReportRow => ({
  variant_id: 1, product_id: 1, sku: 'JOV-1', name_en: 'Jovie 1', name_ar: 'جوفي 1', archived: false, units_ordered: 6, orders_count: 6,
  gross_value_piastres: 270000, returned_units: 1, cancelled_units: 1, current_price_piastres: 99900, current_stock: 44, ...o,
});
const inventory = (): InventoryReport => ({
  rows: [
    { variant_id: 1, sku: 'JOV-1', name_en: 'Jovie 1', name_ar: 'جوفي 1', is_active: true, current_stock: 33, low_stock_threshold: 40, stock_status: 'low_stock',
      increase: 10, decrease: 2, movements: 2, history_complete: true, opening_stock: 20, closing_stock: 28 },
    { variant_id: 2, sku: 'JOV-2', name_en: 'Jovie 2', name_ar: 'جوفي 2', is_active: true, current_stock: 50, low_stock_threshold: null, stock_status: 'in_stock',
      increase: 0, decrease: 0, movements: 0, history_complete: false, opening_stock: null, closing_stock: null },
  ],
  reasons: {
    initial_stock: { increase: 0, decrease: 0, count: 0 }, restock: { increase: 10, decrease: 0, count: 1 }, write_off: { increase: 0, decrease: 2, count: 1 },
  },
  summary: { tracked: 2, in_stock: 1, low_stock: 1, out_of_stock: 0, increase: 10, decrease: 2 },
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin reports', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let language: LanguageService;
  let downloads: jasmine.Spy;

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
    // Never save a real file during tests.
    downloads = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
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
  const govs = () => answer(is('GET', '/api/v1/governorates'), (r) => r.flush({ data: [{ id: 1, name: { en: 'Cairo', ar: 'القاهرة' } }, { id: 2, name: { en: 'Giza', ar: 'الجيزة' } }] }));

  async function open(url: string, who: AdminUser): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
    await navigation;
    await settle();
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) => (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const norm = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
  /** A row or card as its cells' texts joined by spaces. */
  const parts = (node: Element) => Array.from(node.children).map((c) => norm(c.textContent)).join(' ');
  const texts = (selector: string) => Array.from(el().querySelectorAll(selector)).map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
  const click = async (selector: string) => {
    (el().querySelector(selector) as HTMLElement).click();
    await settle();
  };
  const choose = async (selector: string, value: string) => {
    const select = el().querySelector(selector) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  };

  async function openSales(report = sales()): Promise<TestRequest> {
    await open('/admin/reports', storeManager);
    return answer(is('GET', `${R}/sales`), (r) => r.flush({ data: report }));
  }

  describe('period helpers', () => {
    it('builds presets from the Cairo calendar day', () => {
      expect(cairoToday(new Date('2026-11-02T22:30:00Z'))).toBe('2026-11-03'); // 00:30 in Cairo
      expect(presetPeriod('last_7_days', '2026-11-03')).toEqual({ preset: 'last_7_days', from: '2026-10-28', to: '2026-11-03' });
      expect(presetPeriod('last_30_days', '2026-11-03')).toEqual({ preset: 'last_30_days', from: '2026-10-05', to: '2026-11-03' });
      expect(presetPeriod('this_month', '2026-11-03')).toEqual({ preset: 'this_month', from: '2026-11-01', to: '2026-11-03' });
      expect(presetPeriod('last_month', '2026-03-15')).toEqual({ preset: 'last_month', from: '2026-02-01', to: '2026-02-28' });
      expect(presetPeriod('last_month', '2026-01-10')).toEqual({ preset: 'last_month', from: '2025-12-01', to: '2025-12-31' });
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
      expect(daysBetween('2026-01-01', '2026-12-31')).toBe(365);
    });
  });

  describe('access', () => {
    it('keeps admins without payments.manage out and hides the link', async () => {
      await open('/admin/reports', support);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/reports"]')).toBeNull();
    });

    it('opens the sales report for the last 30 days, with all four tabs for store managers', async () => {
      const request = await openSales();
      expect(router.url).toBe('/admin/reports/sales');
      const expected = presetPeriod('last_30_days');
      expect(request.request.params.get('from')).toBe(expected.from);
      expect(request.request.params.get('to')).toBe(expected.to);
      expect(texts('.rep-tabs a')).toEqual(['Sales & revenue', 'Orders', 'Products', 'Inventory']);
      expect(el().querySelector('.rep-tabs a.is-active')?.getAttribute('aria-current')).toBe('page');
      expect(el().querySelector('.adm-side a[href="/admin/reports"] .adm-soon')).toBeNull();
    });

    it('hides the inventory report from admins without inventory.manage', async () => {
      await open('/admin/reports/inventory', admin('store_manager', ['orders.view', 'payments.manage']));
      expect(router.url).toBe('/admin/forbidden');
      await harness.navigateByUrl('/admin/reports/sales');
      await answer(is('GET', `${R}/sales`), (r) => r.flush({ data: sales() }));
      expect(texts('.rep-tabs a')).toEqual(['Sales & revenue', 'Orders', 'Products']);
    });
  });

  describe('period', () => {
    it('reloads with a preset and checks a custom range before asking the server', async () => {
      await openSales();
      await choose('#rep-preset', 'last_7_days');
      const week = await answer(is('GET', `${R}/sales`), (r) => r.flush({ data: sales() }));
      expect(daysBetween(week.request.params.get('from')!, week.request.params.get('to')!)).toBe(7);

      await choose('#rep-preset', 'custom');
      (el().querySelector('#rep-from') as HTMLInputElement).value = '2026-11-05';
      (el().querySelector('#rep-to') as HTMLInputElement).value = '2026-11-01';
      await click('.rep-period button[type="submit"]');
      expect(text('#rep-range-err')).toContain('end on or after the start');
      http.expectNone((r) => r.url === `${R}/sales`);

      (el().querySelector('#rep-from') as HTMLInputElement).value = '2026-11-01';
      (el().querySelector('#rep-to') as HTMLInputElement).value = '2026-11-05';
      await click('.rep-period button[type="submit"]');
      const custom = await answer(is('GET', `${R}/sales`), (r) => r.flush({ data: sales() }));
      expect([custom.request.params.get('from'), custom.request.params.get('to')]).toEqual(['2026-11-01', '2026-11-05']);
      expect(text('.rep-period-note')).toBe('1 Nov 2026 to 5 Nov 2026, both days included, Egyptian time (Cairo).');
    });
  });

  describe('sales', () => {
    it('shows order value, collected payments and outstanding apart, with the attention list', async () => {
      await openSales();
      const cards = Array.from(el().querySelectorAll('.adm-stat')).map(parts);
      expect(cards).toEqual([
        'Orders placed EGP 3,530 7 orders',
        'Placed and now paid EGP 2,010 4 orders',
        'Collected payments EGP 2,010 4 payments',
        'Outstanding EGP 1,010 2 orders still going ahead and not paid',
      ]);
      const attention = texts('.rep-attention li');
      expect(attention.length).toBe(5);
      expect(attention[0]).toContain('later cancelled, expired or returned');
      expect(attention[1]).toContain('more than one successful payment');
      expect(attention[4]).toContain('not counted as collected');
      expect(text('.rep-definitions')).toContain('it is not revenue');
    });

    it('draws the trend on one axis with a legend, a readout and a table view', async () => {
      await openSales();
      expect(texts('.rep-legend li')).toEqual(['Order value', 'Collected payments']);
      const groups = el().querySelectorAll('.rep-group');
      expect(groups.length).toBe(2);
      const heights = (i: number) => Array.from(groups[i].querySelectorAll('.rep-bar')).map((b) => (b as HTMLElement).style.height);
      // The axis tops at EGP 4,000 (353000 rounded up): 3530/4000 and 1500/4000.
      expect(heights(0)).toEqual(['88.25%', '37.5%']);
      expect(heights(1)).toEqual(['0%', '12.75%']);
      expect(texts('.rep-grid span')).toEqual(['EGP 4,000', 'EGP 2,000', 'EGP 0']);
      expect(norm(groups[0].getAttribute('aria-label'))).toBe('3 Nov 2026 · Order value: EGP 3,530 · Collected payments: EGP 1,500 · Orders: 7');

      (groups[1] as HTMLElement).dispatchEvent(new Event('mouseenter'));
      await settle();
      expect(text('.rep-readout')).toContain('4 Nov 2026');
      (groups[1] as HTMLElement).dispatchEvent(new Event('mouseleave'));
      await settle();
      expect(text('.rep-readout')).toBe('');

      expect(parts(el().querySelectorAll('.rep-details tbody tr')[1])).toBe('4 Nov 2026 0 EGP 0 EGP 510');
      expect(texts('#rep-status ~ table tbody tr').length).toBe(9);
      expect(parts(el().querySelector('#rep-method ~ table tbody tr')!)).toBe('Card 4 EGP 2,000 EGP 1,500');
    });

    it('shows empty, error and retry states', async () => {
      await open('/admin/reports/sales', storeManager);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      await answer(is('GET', `${R}/sales`), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', `${R}/sales`), (r) => r.flush({ data: emptySales() }));
      expect(text('app-admin-state')).toBe('No orders or payments in this period.');
    });

    it('exports the same period as CSV with a busy state, then reports success or failure', async () => {
      await openSales();
      await click('app-admin-report-export button');
      expect(text('app-admin-report-export button')).toBe('Preparing the file…');
      expect((el().querySelector('app-admin-report-export button') as HTMLButtonElement).disabled).toBeTrue();
      const file = await answer(is('GET', `${R}/sales/export`), (r) =>
        r.flush(new Blob(['﻿Metric,Value'], { type: 'text/csv' }), {
          headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename=jovie-sales-report_2026-11-03_to_2026-11-04.csv' }),
        }),
      );
      expect(file.request.responseType).toBe('blob');
      expect(file.request.params.get('lang')).toBe('en');
      expect(file.request.params.get('from')).toBe(presetPeriod('last_30_days').from);
      expect(downloads).toHaveBeenCalledTimes(1);
      expect(text('.rep-export-msg')).toBe('Downloaded jovie-sales-report_2026-11-03_to_2026-11-04.csv.');

      await click('app-admin-report-export button');
      await answer(is('GET', `${R}/sales/export`), (r) => r.flush(new Blob(['{}']), { status: 500, statusText: 'Server Error' }));
      expect(text('.rep-export-msg')).toBe('The export could not be prepared. Please try again.');
    });

    it('shows Arabic texts right to left and exports Arabic headers', async () => {
      language.setLanguage('ar');
      await openSales();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('main h1')).toBe('المبيعات والتقارير');
      expect(texts('.rep-tabs a')[0]).toBe('المبيعات والإيرادات');
      expect(text('.rep-legend')).toContain('المدفوعات المحصَّلة');
      await click('app-admin-report-export button');
      const file = await answer(is('GET', `${R}/sales/export`), (r) => r.flush(new Blob(['x'])));
      expect(file.request.params.get('lang')).toBe('ar');
    });
  });

  describe('orders', () => {
    it('filters on the server, pages, links to the order page and exports the same filters', async () => {
      await open('/admin/reports/orders', storeManager);
      await govs();
      await answer(is('GET', `${R}/orders`), (r) => r.flush(ordersReport(2, 1, 3)));
      expect(texts('.adm-stat-value')).toEqual(['2', 'EGP 1,020', 'EGP 510', 'EGP 0']);
      const rows = el().querySelectorAll('.rep-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/orders/JV-261103-00001');
      expect(rows[1].textContent).toContain('Cancelled');

      (el().querySelector('#rep-status') as HTMLSelectElement).value = 'delivered';
      (el().querySelector('#rep-method') as HTMLSelectElement).value = 'cod';
      (el().querySelector('#rep-gov') as HTMLSelectElement).value = '2';
      (el().querySelector('form.rep-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle();
      const filtered = await answer(is('GET', `${R}/orders`), (r) => r.flush(ordersReport(0)));
      expect(['status', 'payment_method', 'governorate_id', 'page'].map((k) => filtered.request.params.get(k))).toEqual(['delivered', 'cod', '2', '1']);
      expect(filtered.request.params.has('payment_status')).toBeFalse();
      expect(text('.rep-panel app-admin-state')).toBe('No orders match this period and these filters.');
      expect((el().querySelector('app-admin-report-export button') as HTMLButtonElement).disabled).toBeTrue();

      await click('.rep-buttons .adm-link');
      await answer(is('GET', `${R}/orders`), (r) => r.flush(ordersReport(2, 1, 3)));
      await click('.rep-pages button:last-child');
      const second = await answer(is('GET', `${R}/orders`), (r) => r.flush(ordersReport(2, 2, 3)));
      expect(second.request.params.get('page')).toBe('2');

      await click('app-admin-report-export button');
      const file = await answer(is('GET', `${R}/orders/export`), (r) => r.flush(new Blob(['x'])));
      expect(file.request.params.has('status')).toBeFalse();
      expect(file.request.params.get('lang')).toBe('en');
    });
  });

  describe('products and inventory', () => {
    it('lists products with historical sales apart from current price and stock', async () => {
      await open('/admin/reports/products', storeManager);
      await answer(is('GET', `${R}/products`), (r) => r.flush({ data: [product(), product({ variant_id: 2, sku: 'JOV-2', name_en: 'Jovie 2', units_ordered: 0, orders_count: 0, gross_value_piastres: 0, returned_units: 0, cancelled_units: 0, current_price_piastres: null, archived: true })] }));
      const cells = Array.from(el().querySelectorAll('.rep-table tbody tr:first-child td')).map((td) => norm(td.textContent));
      expect(cells).toEqual(['6', '6', 'EGP 2,700', '1', '1', 'EGP 999', '44']);
      expect(text('.rep-table tbody tr:nth-child(2)')).toContain('Archived');
      expect(text('.rep-table tbody tr:nth-child(2)')).toContain('No price');
      expect(text('.rep-definitions')).toContain('Gross value is not profit');
    });

    it('shows stock, movement totals and an honest note when history is incomplete', async () => {
      await open('/admin/reports/inventory', storeManager);
      await answer(is('GET', `${R}/inventory`), (r) => r.flush({ data: inventory() }));
      expect(texts('.adm-stat-value')).toEqual(['2', '1', '0', '10', '2']);
      const first = Array.from(el().querySelectorAll('#rep-inv-stock ~ table tbody tr:first-child td')).map((td) => (td.textContent ?? '').trim());
      expect(first).toEqual(['33', 'Low stock', '20', '+10', '−2', '28', '2']);
      expect(text('#rep-inv-stock ~ table tbody tr:nth-child(2)')).toContain('History incomplete');
      expect(text('#rep-inv-stock ~ table tbody tr:nth-child(2)')).toContain('Not available');
      expect(Array.from(el().querySelectorAll('#rep-inv-reasons ~ table tbody tr')).map(parts)).toEqual(['New shipment received +10 −0 1', 'Damaged or missing +0 −2 1']);
    });
  });
});
