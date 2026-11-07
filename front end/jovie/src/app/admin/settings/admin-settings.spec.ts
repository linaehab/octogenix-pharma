import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AdminGovernorate, AdminSetting, SettingsList } from './admin-settings.models';

const ME = '/api/v1/admin/auth/me';
const GOVERNORATES = '/api/v1/admin/governorates';
const SETTINGS = '/api/v1/admin/settings';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);
const superAdmin = admin('super_admin', [
  'admins.manage', 'settings.manage', 'content.manage', 'messages.view', 'messages.manage', 'catalog.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage',
]);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);

const gov = (id: number, o: Partial<AdminGovernorate> = {}): AdminGovernorate => ({
  id, code: `EG-${id}`, name_en: `Governorate ${id}`, name_ar: `محافظة ${id}`, shipping_fee_piastres: 5000, delivery_days_min: null,
  delivery_days_max: null, cod_available: true, is_deliverable: true, sort_order: id, updated_at: '2026-11-03T21:47:01+00:00', ...o,
});
const governorates = (): AdminGovernorate[] => [
  gov(1, { code: 'EG-C', name_en: 'Cairo', name_ar: 'القاهرة' }),
  gov(2, { code: 'EG-GZ', name_en: 'Giza', name_ar: 'الجيزة', shipping_fee_piastres: 6050 }),
  gov(3, { code: 'EG-ASN', name_en: 'Aswan', name_ar: 'أسوان', shipping_fee_piastres: null, is_deliverable: false }),
];

const setting = (key: string, value: unknown): AdminSetting => ({ key, group: key.split('.')[0], type: 'x', is_public: true, value });
const settingsList = (o: Record<string, unknown> = {}, meta: Partial<SettingsList['meta']> = {}): SettingsList => {
  const values: Record<string, unknown> = {
    'contact.email': 'info@example.com',
    'store.enabled': true,
    'store.card_payments_enabled': false,
    'store.card_provider': null,
    'store.cod_enabled': true,
    'store.cod_fee_piastres': 0,
    'store.free_shipping_threshold_piastres': null,
    'store.pending_payment_ttl_minutes': 30,
    ...o,
  };
  return {
    data: Object.entries(values).map(([key, value]) => setting(key, value)),
    meta: { currency: 'EGP', test_mode: false, card_providers: [], ...meta },
  };
};
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin shipping & store settings', () => {
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
    // The header bell asks for the unread count when the dashboard opens.
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
  const choose = async (selector: string, value: string) => {
    const select = el().querySelector(selector) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  };
  const submitDialog = () => click('dialog[open] form button[type="submit"]');
  const dialogButtons = () => Array.from(el().querySelectorAll('dialog[open] .set-dialog-actions button')) as HTMLButtonElement[];

  async function openShipping(rows = governorates(), who: AdminUser = storeManager): Promise<void> {
    await open('/admin/settings/shipping', who);
    await answer(is('GET', GOVERNORATES), (r) => r.flush({ data: rows }));
  }

  async function openStore(list = settingsList()): Promise<void> {
    await open('/admin/settings/store', superAdmin);
    await answer(is('GET', SETTINGS), (r) => r.flush(list));
  }

  /** Opens the edit dialog of the governorate on the given row. */
  async function editRow(index: number): Promise<void> {
    (el().querySelectorAll('.shp-table tbody tr .shp-actions button')[index] as HTMLButtonElement).click();
    await settle();
  }

  describe('access', () => {
    it('sends /admin/settings to the shipping page for store managers, who cannot open store settings', async () => {
      await open('/admin/settings', storeManager);
      expect(router.url).toBe('/admin/settings/shipping');
      await answer(is('GET', GOVERNORATES), (r) => r.flush({ data: [] }));
      expect(el().querySelector('.set-tabs')).toBeNull();
      expect(texts('.set-crumbs li')).toEqual(['Overview', 'Shipping & store settings', 'Shipping fees']);
      expect(text('.set-crumbs [aria-current="page"]')).toBe('Shipping fees');
      const side = el().querySelector('.adm-side a[href="/admin/settings"]');
      expect(side?.classList).toContain('is-active');
      expect(side?.querySelector('.adm-soon')).toBeNull();

      await harness.navigateByUrl('/admin/settings/store');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
    });

    it('shows both pages as tabs to super admins', async () => {
      await open('/admin/settings', superAdmin);
      expect(router.url).toBe('/admin/settings/shipping');
      await answer(is('GET', GOVERNORATES), (r) => r.flush({ data: [] }));
      expect(texts('.set-tabs a')).toEqual(['Shipping fees', 'Store settings']);
      expect(el().querySelector('.set-tabs a.is-active')?.getAttribute('aria-current')).toBe('page');

      await click('.set-tabs a[href="/admin/settings/store"]');
      await answer(is('GET', SETTINGS), (r) => r.flush(settingsList()));
      expect(router.url).toBe('/admin/settings/store');
      expect(text('main h1')).toBe('Store settings');
    });

    it('opens store settings directly for an admin who only manages settings', async () => {
      await open('/admin/settings', admin('super_admin', ['settings.manage']));
      expect(router.url).toBe('/admin/settings/store');
      await answer(is('GET', SETTINGS), (r) => r.flush(settingsList()));
    });

    it('sends admins without either permission to the 403 page and hides the link', async () => {
      await open('/admin/settings/shipping', support);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/settings"]')).toBeNull();
      await harness.navigateByUrl('/admin/settings');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
    });

    it('sends signed-out visitors to the admin login', async () => {
      await open('/admin/settings/store', null);
      expect(router.url).toBe('/admin/login');
    });
  });

  describe('shipping list', () => {
    it('shows a loading state, then every governorate with both names, fee, delivery and last update', async () => {
      await open('/admin/settings/shipping', storeManager);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      await answer(is('GET', GOVERNORATES), (r) => r.flush({ data: governorates() }));

      expect(text('.shp-summary')).toBe('3 governorates: delivery on in 2, off in 1.');
      expect(text('.shp-warning')).toContain('1 governorate(s) have no shipping fee yet');
      expect(text('.shp-note')).toContain('Orders already placed keep the shipping fee saved with them.');
      const rows = el().querySelectorAll('.shp-table tbody tr');
      expect(rows.length).toBe(3);
      const cells = (i: number) => Array.from(rows[i].querySelectorAll('td')).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(cells(0).slice(0, 4)).toEqual(['Cairo', 'القاهرة', 'EGP 50', 'Delivery on']);
      expect(cells(1)[2]).toBe('EGP 60.50');
      expect(cells(2).slice(2, 4)).toEqual(['No fee set', 'Delivery off']);
      expect(cells(0)[4]).toContain('2026');
      expect(rows[0].querySelector('[lang="ar"]')?.getAttribute('dir')).toBe('rtl');
      expect(rows[0].querySelector('[lang="en"]')?.getAttribute('dir')).toBe('ltr');
      expect(rows[0].querySelector('button')?.getAttribute('aria-label')).toBe('Edit shipping for Cairo');
    });

    it('searches English and Arabic names (with or without hamza) and filters by delivery', async () => {
      await openShipping();
      await type('#shp-search', 'giz');
      expect(texts('.shp-table tbody tr td:first-child')).toEqual(['Giza']);
      await type('#shp-search', 'اسوان');
      expect(texts('.shp-table tbody tr td:first-child')).toEqual(['Aswan']);
      await type('#shp-search', '');

      await choose('#shp-status', 'disabled');
      expect(texts('.shp-table tbody tr td:first-child')).toEqual(['Aswan']);
      await choose('#shp-status', 'enabled');
      expect(texts('.shp-table tbody tr td:first-child')).toEqual(['Cairo', 'Giza']);
      await type('#shp-search', 'Aswan');
      expect(text('app-admin-state')).toBe('No governorate matches these filters.');
      expect(text('#shp-results')).toBe('Governorates: 0');

      await click('.shp-clear');
      expect(el().querySelectorAll('.shp-table tbody tr').length).toBe(3);
      expect((el().querySelector('#shp-search') as HTMLInputElement).value).toBe('');
    });

    it('shows error and empty states, with a retry', async () => {
      await open('/admin/settings/shipping', storeManager);
      await answer(is('GET', GOVERNORATES), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', GOVERNORATES), (r) => r.flush({ data: [] }));
      expect(text('app-admin-state')).toBe('No governorates were found.');
    });

    it('switches tables to cards on narrow panels', async () => {
      await openShipping();
      const panel = el().querySelector('.shp-panel') as HTMLElement;
      panel.style.width = '1000px';
      expect(getComputedStyle(el().querySelector('.shp-table thead')!).display).toBe('table-header-group');
      panel.style.width = '400px';
      expect(getComputedStyle(el().querySelector('.shp-table thead')!).display).toBe('none');
      expect(el().querySelector('.shp-table td[data-label]')?.getAttribute('data-label')).toBe('Name (English)');
    });

    it('shows Arabic texts right to left', async () => {
      language.setLanguage('ar');
      await openShipping();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('main h1')).toBe('رسوم الشحن');
      expect(text('.shp-summary')).toContain('التوصيل مفعّل في');
      expect(el().querySelector('.shp-table tbody tr button')?.getAttribute('aria-label')).toBe('تعديل الشحن إلى القاهرة');
      expect(text('.shp-table tbody tr .shp-fee')).toContain('ج.م');
    });
  });

  describe('shipping fee editing', () => {
    it('validates the amount in the browser and sends nothing for invalid or unchanged values', async () => {
      await openShipping();
      await editRow(0);
      expect(text('dialog[open] .set-current')).toBe('Now: EGP 50 · Delivery on');
      expect((el().querySelector('#set-fee') as HTMLInputElement).value).toBe('50');

      for (const bad of ['abc', '-5', '12.345', '1e3']) {
        await type('#set-fee', bad);
        await submitDialog();
        expect(text('#set-fee-err')).toBe('Enter an amount in EGP with up to 2 decimal places, for example 50 or 52.50.');
        expect(el().querySelector('#set-fee')?.getAttribute('aria-invalid')).toBe('true');
      }
      await type('#set-fee', '99999999');
      await submitDialog();
      expect(text('#set-fee-err')).toBe('This amount is too large.');

      await type('#set-fee', '');
      await submitDialog();
      expect(text('#set-fee-err')).toBe('Enter a fee (0 for free delivery) before turning delivery on.');

      await type('#set-fee', '50.00');
      await submitDialog();
      expect(text('dialog[open] .adm-notice')).toBe('Nothing was changed.');
      http.expectNone((r) => !r.url.endsWith('/notifications/unread-count'));
    });

    it('reviews the change, then saves the fee in piastres with the values the admin saw', async () => {
      await openShipping();
      await editRow(1);
      await type('#set-fee', '٧٥٫٢٥');
      await submitDialog();
      expect(text('dialog[open] h2')).toBe('Confirm the change');
      expect(texts('dialog[open] .set-review li')).toEqual(['Shipping fee: EGP 60.50 → EGP 75.25']);
      expect(text('dialog[open] .set-note')).toContain('new orders only');
      expect(document.activeElement?.textContent?.trim()).toBe('Confirm and save');

      const confirm = dialogButtons()[1];
      confirm.click();
      confirm.click();
      await settle();
      expect(confirm.disabled).toBeTrue();
      await csrf();
      const saved = await answer(is('PATCH', `${GOVERNORATES}/2`), (r) =>
        r.flush({ data: gov(2, { code: 'EG-GZ', name_en: 'Giza', name_ar: 'الجيزة', shipping_fee_piastres: 7525, updated_at: '2026-11-07T10:00:00+00:00' }) }),
      );
      expect(saved.request.body).toEqual({ expected_shipping_fee_piastres: 6050, expected_is_deliverable: true, shipping_fee_piastres: 7525 });
      expect(el().querySelector('dialog[open]')).toBeNull();
      expect(text('.shp-notice')).toBe('Shipping for Giza was saved.');
      expect(text('.shp-table tbody tr:nth-child(2) .shp-fee')).toBe('EGP 75.25');
    });

    it('warns before turning delivery off, and Back keeps what was typed', async () => {
      await openShipping();
      await editRow(0);
      (el().querySelector('dialog[open] input[type="checkbox"]') as HTMLInputElement).click();
      await type('#set-fee', '45');
      await submitDialog();
      expect(texts('dialog[open] .set-review li')).toEqual(['Shipping fee: EGP 50 → EGP 45', 'Delivery: On → Off']);
      expect(text('dialog[open] .set-note.is-warning')).toBe('Customers will no longer be able to choose Cairo at checkout.');

      dialogButtons()[0].click();
      await settle();
      expect((el().querySelector('#set-fee') as HTMLInputElement).value).toBe('45');
      expect((el().querySelector('dialog[open] input[type="checkbox"]') as HTMLInputElement).checked).toBeFalse();
      dialogButtons()[0].click();
      await settle();
      expect(el().querySelector('dialog[open]')).toBeNull();
    });

    it('needs a fee before delivery can be turned on', async () => {
      await openShipping();
      await editRow(2);
      (el().querySelector('dialog[open] input[type="checkbox"]') as HTMLInputElement).click();
      await submitDialog();
      expect(text('#set-fee-err')).toBe('Enter a fee (0 for free delivery) before turning delivery on.');
      await type('#set-fee', '0');
      await submitDialog();
      expect(texts('dialog[open] .set-review li')).toEqual(['Shipping fee: No fee set → EGP 0', 'Delivery: Off → On']);
      expect(text('dialog[open] .set-note.is-warning')).toBe('Customers will be able to choose Aswan at checkout and pay this fee.');
      dialogButtons()[1].click();
      await settle();
      await csrf();
      const saved = await answer(is('PATCH', `${GOVERNORATES}/3`), (r) => r.flush({ data: gov(3, { name_en: 'Aswan', name_ar: 'أسوان', shipping_fee_piastres: 0 }) }));
      expect(saved.request.body).toEqual({ expected_shipping_fee_piastres: null, expected_is_deliverable: false, shipping_fee_piastres: 0, is_deliverable: true });
    });

    it('shows the current values when someone else changed the governorate meanwhile', async () => {
      await openShipping();
      await editRow(0);
      await type('#set-fee', '70');
      await submitDialog();
      dialogButtons()[1].click();
      await settle();
      await csrf();
      await answer(is('PATCH', `${GOVERNORATES}/1`), (r) =>
        r.flush({ message: 'Changed.', current: gov(1, { code: 'EG-C', name_en: 'Cairo', name_ar: 'القاهرة', shipping_fee_piastres: 6500 }) }, { status: 409, statusText: 'Conflict' }),
      );
      expect(text('dialog[open] .adm-notice')).toContain('changed by someone else meanwhile, so nothing was saved');
      expect((el().querySelector('#set-fee') as HTMLInputElement).value).toBe('65');
      expect(text('dialog[open] .set-current')).toBe('Now: EGP 65 · Delivery on');
      expect(text('.shp-table tbody tr:first-child .shp-fee')).toBe('EGP 65');
    });

    it('shows the API validation message and goes back to the form', async () => {
      await openShipping();
      await editRow(0);
      await type('#set-fee', '70');
      await submitDialog();
      dialogButtons()[1].click();
      await settle();
      await csrf();
      await answer(is('PATCH', `${GOVERNORATES}/1`), (r) =>
        r.flush({ message: 'Invalid.', errors: { shipping_fee_piastres: ['The shipping fee piastres field must be an integer.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(el().querySelector('#set-fee')).not.toBeNull();
      expect(text('dialog[open] .adm-notice')).toBe('The change could not be saved. The shipping fee piastres field must be an integer.');
    });
  });

  describe('store settings', () => {
    it('lists the existing store settings with their meaning, current value and the fixed facts', async () => {
      await openStore(settingsList({}, { test_mode: true, card_providers: ['mock'] }));
      const names = texts('.sto-text h3').map((t) => t.replace('Affects checkout', '').trim());
      expect(names).toEqual([
        'Store open for orders', 'Cash on delivery', 'Cash-on-delivery fee', 'Card payments', 'Free shipping from', 'Time to finish a card payment',
      ]);
      expect(texts('.sto-value strong')).toEqual(['On', 'On', 'EGP 0', 'Off', 'No free shipping', '30 minutes']);
      expect(text('.sto-text p')).toContain('customers cannot place new orders');
      expect(text('.sto-test')).toContain('Test mode is on');
      expect(text('.sto-fixed')).toContain('Egyptian pound (EGP)');
      expect(text('.sto-fixed')).toContain('None set up');
      expect(text('main')).not.toContain('info@example.com');
    });

    it('confirms closing the store and saves only that setting with the value the admin saw', async () => {
      await openStore();
      await click('.sto-item:nth-child(1) .sto-action button');
      expect(text('dialog[open] h2')).toBe('Store open for orders');
      (el().querySelector('dialog[open] input[value="off"]') as HTMLInputElement).click();
      await settle();
      await submitDialog();
      expect(texts('dialog[open] .set-review li')).toEqual(['Store open for orders: On → Off']);
      expect(text('dialog[open] .set-note.is-warning')).toBe('Customers will not be able to place orders until the store is opened again.');

      dialogButtons()[1].click();
      await settle();
      await csrf();
      const saved = await answer(is('PATCH', SETTINGS), (r) => r.flush(settingsList({ 'store.enabled': false })));
      expect(saved.request.body).toEqual({ settings: { 'store.enabled': false }, expected: { 'store.enabled': true } });
      expect(text('.sto-notice')).toBe('“Store open for orders” was saved.');
      expect(texts('.sto-value strong')[0]).toBe('Off');
    });

    it('cannot turn card payments on without a configured provider', async () => {
      await openStore();
      await click('.sto-item:nth-child(4) .sto-action button');
      const on = el().querySelector('dialog[open] input[value="on"]') as HTMLInputElement;
      expect(on.disabled).toBeTrue();
      expect(text('dialog[open] form')).toContain('Card payments can only be turned on after a card payment provider is set up');
      await submitDialog();
      expect(text('dialog[open] .adm-notice')).toBe('Nothing was changed.');
    });

    it('needs a cash-on-delivery fee before cash on delivery can be turned on', async () => {
      await openStore(settingsList({ 'store.cod_enabled': false, 'store.cod_fee_piastres': null }));
      await click('.sto-item:nth-child(2) .sto-action button');
      (el().querySelector('dialog[open] input[value="on"]') as HTMLInputElement).click();
      await settle();
      await submitDialog();
      expect(text('#set-store-err')).toBe('Set the cash-on-delivery fee first (0 is allowed).');
    });

    it('validates amounts and minutes, and allows clearing free shipping', async () => {
      await openStore(settingsList({ 'store.free_shipping_threshold_piastres': 150000 }));
      await click('.sto-item:nth-child(3) .sto-action button');
      await type('#set-store-value', '');
      await submitDialog();
      expect(text('#set-store-err')).toBe('Enter an amount (0 is allowed).');
      await type('#set-store-value', '12.345');
      await submitDialog();
      expect(text('#set-store-err')).toBe('Enter an amount in EGP with up to 2 decimal places, for example 25 or 25.50.');
      dialogButtons()[0].click();
      await settle();

      await click('.sto-item:nth-child(6) .sto-action button');
      for (const bad of ['4', '1441', '2.5', 'soon']) {
        await type('#set-store-value', bad);
        await submitDialog();
        expect(text('#set-store-err')).toBe('Enter a whole number from 5 to 1440.');
      }
      dialogButtons()[0].click();
      await settle();

      await click('.sto-item:nth-child(5) .sto-action button');
      expect((el().querySelector('#set-store-value') as HTMLInputElement).value).toBe('1500');
      await type('#set-store-value', '');
      await submitDialog();
      expect(texts('dialog[open] .set-review li')).toEqual(['Free shipping from: EGP 1,500 → No free shipping']);
      expect(text('dialog[open] .set-note:not(.is-warning)')).toContain('Orders already placed keep their amounts');
      dialogButtons()[1].click();
      await settle();
      await csrf();
      const saved = await answer(is('PATCH', SETTINGS), (r) => r.flush(settingsList()));
      expect(saved.request.body).toEqual({
        settings: { 'store.free_shipping_threshold_piastres': null },
        expected: { 'store.free_shipping_threshold_piastres': 150000 },
      });
    });

    it('shows the current value when the setting was changed meanwhile, and API errors', async () => {
      await openStore();
      await click('.sto-item:nth-child(3) .sto-action button');
      await type('#set-store-value', '15');
      await submitDialog();
      dialogButtons()[1].click();
      await settle();
      await csrf();
      await answer(is('PATCH', SETTINGS), (r) =>
        r.flush({ message: 'Changed.', current: { 'store.cod_fee_piastres': 2000 } }, { status: 409, statusText: 'Conflict' }),
      );
      expect(text('dialog[open] .adm-notice')).toContain('nothing was saved');
      expect(text('dialog[open] .set-current')).toBe('Current value: EGP 20');
      expect(texts('.sto-value strong')[2]).toBe('EGP 20');

      await type('#set-store-value', '15');
      await submitDialog();
      dialogButtons()[1].click();
      await settle();
      // The XSRF cookie was fetched before the first save.
      await answer(is('PATCH', SETTINGS), (r) => r.flush({ message: 'Forbidden.' }, { status: 403, statusText: 'Forbidden' }));
      expect(text('dialog[open] .adm-notice')).toBe('The change could not be saved. Forbidden.');
    });

    it('shows Arabic texts and the error state', async () => {
      language.setLanguage('ar');
      await open('/admin/settings/store', superAdmin);
      await answer(is('GET', SETTINGS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', SETTINGS), (r) => r.flush(settingsList()));
      expect(text('main h1')).toBe('إعدادات المتجر');
      expect(texts('.sto-value strong')[0]).toBe('مفعّل');
      expect(text('.sto-fixed')).toContain('الجنيه المصري');
    });
  });
});
