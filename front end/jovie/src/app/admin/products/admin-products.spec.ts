import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AdminProduct } from './admin-products.models';
import { egpToPiastres, piastresToEgp } from './money';

describe('EGP and piastres', () => {
  it('converts typed amounts to integer piastres without floating point', () => {
    expect(egpToPiastres('520')).toBe(52000);
    expect(egpToPiastres('520.5')).toBe(52050);
    expect(egpToPiastres('520.50')).toBe(52050);
    expect(egpToPiastres('0.10')).toBe(10);
    expect(egpToPiastres('1,250.75')).toBe(125075);
    expect(egpToPiastres(' 99.99 ')).toBe(9999);
    expect(egpToPiastres('٥٢٠٫٥')).toBe(52050);
    expect(egpToPiastres('')).toBeNull();
    expect(egpToPiastres(null)).toBeNull();
    for (const bad of ['-5', '520.555', 'abc', '5e3', '1.2.3', '123456789']) {
      expect(egpToPiastres(bad)).withContext(bad).toBeNaN();
    }
  });

  it('shows piastres as an EGP amount for editing', () => {
    expect(piastresToEgp(52050)).toBe('520.50');
    expect(piastresToEgp(50000)).toBe('500');
    expect(piastresToEgp(5)).toBe('0.05');
    expect(piastresToEgp(null)).toBe('');
  });
});

const ME = '/api/v1/admin/auth/me';
const PRODUCTS = '/api/v1/admin/products';
const ALL: AdminPermission[] = [
  'admins.manage', 'settings.manage', 'content.manage', 'messages.view', 'messages.manage', 'catalog.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage',
];
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);
const catalogOnly = admin('store_manager', ['catalog.manage']);

const product = (id: number, overrides: Partial<AdminProduct> = {}): AdminProduct => ({
  id,
  brand_id: 1,
  slug: `product-${id}`,
  name_en: `Product ${id}`,
  name_ar: `منتج ${id}`,
  subtitle_en: null, subtitle_ar: null, short_description_en: 'Short', short_description_ar: 'قصير',
  description_en: null, description_ar: null,
  stage: 1, age_from_months: 0, age_to_months: 6,
  is_active: true, is_purchasable: true, is_featured: false, sort_order: 0,
  variants: [{
    id: id * 10, product_id: id, sku: `SKU-${id}`, barcode: null, name_en: '400 g', name_ar: '400 جم', net_weight_grams: 400,
    price_piastres: 52050, compare_at_price_piastres: 60000, stock_quantity: 84, low_stock_threshold: null, max_per_order: null,
    is_default: true, is_active: true, is_low_on_stock: false, updated_at: null,
  }],
  images: [{ id: id * 100, url: '/assets/images/jovie.jpg', alt: { en: null, ar: null }, is_primary: true, sort_order: 0 }],
  order_items_count: 3,
  archived_at: null,
  created_at: '2026-11-01T10:00:00+00:00',
  updated_at: '2026-11-05T10:00:00+00:00',
  ...overrides,
});
const page = (data: AdminProduct[], current = 1, last = 1, total = data.length) => ({ data, meta: { current_page: current, last_page: last, per_page: 20, total } });
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin products', () => {
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

  /** Waits for a request matching `test` and answers it; returns the request for inspection. */
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
  const dialogButton = (index: 0 | 1) => el().querySelectorAll('dialog[open] .adm-dialog-actions button')[index] as HTMLButtonElement;
  const type = async (selector: string, value: string) => {
    const input = el().querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await settle();
  };

  describe('permissions', () => {
    it('opens Products for catalog managers and shows it as built in the sidebar', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([])));
      expect(router.url).toBe('/admin/products');
      const link = el().querySelector('.adm-side a[href="/admin/products"]');
      expect(link?.textContent).toContain('Products');
      expect(link?.querySelector('.adm-soon')).toBeNull();
    });

    it('sends admins without catalog.manage to the 403 page, also for the form addresses', async () => {
      const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);
      await open('/admin/products', support);
      expect(router.url).toBe('/admin/forbidden');
      await harness.navigateByUrl('/admin/products/new');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
      await harness.navigateByUrl('/admin/products/5');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/products"]')).toBeNull();
    });
  });

  describe('list', () => {
    it('shows a loading state, then the products with SKU, prices, stock and status', async () => {
      await open('/admin/products', storeManager);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1), product(2, { is_active: false, is_purchasable: false, is_featured: true })])));

      const rows = el().querySelectorAll('.prd-table tbody tr');
      expect(rows.length).toBe(2);
      const first = rows[0].textContent!.replace(/\s+/g, ' ');
      expect(first).toContain('Product 1');
      expect(first).toContain('منتج 1');
      expect(first).toContain('SKU-1');
      expect(first).toContain('EGP 520.50');
      expect(first).toContain('EGP 600');
      expect(first).toContain('84');
      expect(first).toContain('Shown');
      expect(first).toContain('For sale');
      expect(rows[1].textContent).toContain('Hidden');
      expect(rows[1].textContent).toContain('Not for sale');
      expect(text('#prd-results')).toBe('Products: 2');
      expect(rows[0].querySelector('img')?.getAttribute('src')).toBe('/assets/images/jovie.jpg');
    });

    it('searches by name or SKU and filters by status and featured', async () => {
      await open('/admin/products', storeManager);
      const initial = await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));
      expect(initial.request.params.get('page')).toBe('1');
      expect(initial.request.params.has('search')).toBeFalse();

      (el().querySelector('#prd-search') as HTMLInputElement).value = 'sku-1';
      (el().querySelector('form.prd-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const searched = await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));
      expect(searched.request.params.get('search')).toBe('sku-1');

      const status = el().querySelector('#prd-status') as HTMLSelectElement;
      status.value = 'archived';
      status.dispatchEvent(new Event('change'));
      const archived = await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(3, { archived_at: '2026-11-06T10:00:00+00:00', is_active: false })])));
      expect(archived.request.params.get('status')).toBe('archived');
      expect(el().querySelector('.prd-actions')?.textContent).toContain('Restore');
      expect(el().querySelector('.prd-actions a')).toBeNull();

      const featured = el().querySelector('#prd-featured') as HTMLSelectElement;
      featured.value = '1';
      featured.dispatchEvent(new Event('change'));
      const filtered = await answer(is('GET', PRODUCTS), (r) => r.flush(page([])));
      expect(filtered.request.params.get('is_featured')).toBe('1');
      expect(filtered.request.params.get('status')).toBe('archived');
      expect(text('app-admin-state')).toBe('No product matches these filters.');

      await click('.prd-clear');
      const cleared = await answer(is('GET', PRODUCTS), (r) => r.flush(page([])));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page']);
      expect(text('app-admin-state')).toBe('There are no products yet.');
    });

    it('pages through the results', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)], 1, 3, 41)));
      expect(text('.prd-pages')).toContain('Page 1 of 3');
      await click('.prd-pages button:last-child');
      const next = await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(21)], 2, 3, 41)));
      expect(next.request.params.get('page')).toBe('2');
      expect(text('.prd-pages')).toContain('Page 2 of 3');
    });

    it('shows an error state with a retry', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));
      expect(el().querySelectorAll('.prd-table tbody tr').length).toBe(1);
    });

    it('hides a product only after confirmation', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));

      await click('.prd-actions button.adm-button');
      expect(el().querySelector('dialog[open]')?.textContent).toContain('Hide "Product 1" from the store?');
      dialogButton(0).click();
      await settle();
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);

      await click('.prd-actions button.adm-button');
      dialogButton(1).click();
      await settle();
      await csrf();
      const patch = await answer(is('PATCH', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1, { is_active: false }) }));
      expect(patch.request.body).toEqual({ is_active: false });
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1, { is_active: false })])));
      expect(text('.prd-notice')).toBe('"Product 1" is now hidden from the store.');
    });

    it('explains archiving (order history kept) and archives after confirmation', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));
      await click('.prd-archive');
      const dialog = el().querySelector('dialog[open]')!.textContent!;
      expect(dialog).toContain('Nothing is deleted');
      expect(dialog).toContain('It appears in 3 order lines; that order history stays intact.');
      dialogButton(1).click();
      await settle();
      await csrf();
      await answer(is('DELETE', `${PRODUCTS}/1`), (r) => r.flush(null, { status: 204, statusText: 'No Content' }));
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([])));
      expect(text('.prd-notice')).toBe('"Product 1" was archived.');
    });

    it('shows the API reason when showing a product is refused', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1, { is_active: false, images: [] })])));
      await click('.prd-actions button.adm-button');
      await csrf();
      await answer(is('PATCH', `${PRODUCTS}/1`), (r) =>
        r.flush({ message: 'x', errors: { is_active: ['Add at least one image before activating the product.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(text('.prd-notice')).toContain('Add at least one image before activating the product.');
    });

    it('works in Arabic, right to left', async () => {
      await open('/admin/products', storeManager);
      await answer(is('GET', PRODUCTS), (r) => r.flush(page([product(1)])));
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('h1')).toBe('المنتجات');
      const row = el().querySelector('.prd-table tbody tr')!.textContent!;
      expect(row).toContain('منتج 1');
      expect(row).toContain('ظاهر');
      expect(row).toContain('٥٢٠');
    });
  });

  describe('form', () => {
    const fill = async (values: Record<string, string>) => {
      for (const [id, value] of Object.entries(values)) {
        await type(`#${id}`, value);
      }
    };
    const validNew = {
      'prf-name-en': 'Jovie Test',
      'prf-name-ar': 'جوفي تجربة',
      'prf-sku': 'jt-400',
      'prf-size-en': '400 g',
      'prf-size-ar': '400 جم',
      'prf-price-input': '520.50',
      'prf-compare': '600',
    };

    it('shows validation errors and sends nothing when required fields are missing', async () => {
      await open('/admin/products/new', storeManager);
      await click('button[type="submit"]');
      expect(text('.prf-notice')).toContain('Please correct the highlighted fields.');
      expect(el().querySelector('#prf-name-en')?.getAttribute('aria-invalid')).toBe('true');
      expect(el().querySelector('#prf-sku')?.getAttribute('aria-invalid')).toBe('true');
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);
    });

    it('checks prices: format, above zero, and the original price above the price', async () => {
      await open('/admin/products/new', storeManager);
      await fill({ ...validNew, 'prf-price-input': '520.555' });
      expect(el().querySelector('#prf-price-input')?.getAttribute('aria-invalid')).toBe('true');
      await fill({ 'prf-price-input': '0' });
      expect(text('#prf-price-input ~ .prf-error')).toBe('The amount must be more than 0.');
      await fill({ 'prf-price-input': '600', 'prf-compare': '500' });
      expect(text('#prf-compare ~ .prf-error')).toBe('The original price must be higher than the price.');
      await fill({ 'prf-price-input': '' });
      expect(text('#prf-compare ~ .prf-error')).toBe('Enter the price before the original price.');
      await fill({ 'prf-price-input': '520.50' });
      expect(text('#prf-price-help')).toBe('EGP 520.50');
    });

    it('creates the product with prices in piastres, uploads images, and opens the edit page', async () => {
      await open('/admin/products/new', storeManager);
      await fill({ ...validNew, 'prf-initial': '25' });
      expect((el().querySelector('#prf-slug') as HTMLInputElement).value).toBe('jovie-test');
      expect(text('.prf-unsaved')).toContain('Unsaved changes');

      // Images: a text file is refused, a PNG is previewed and becomes the main image.
      const input = el().querySelector('.prf-upload input') as HTMLInputElement;
      const files = new DataTransfer();
      files.items.add(new File(['x'], 'notes.txt', { type: 'text/plain' }));
      files.items.add(new File([new Uint8Array([137, 80, 78, 71])], 'tin.png', { type: 'image/png' }));
      input.files = files.files;
      input.dispatchEvent(new Event('change'));
      await settle();
      expect(text('.prf-file-errors')).toContain('notes.txt: only JPG, PNG or WebP images can be added.');
      expect(el().querySelectorAll('.prf-images li').length).toBe(1);
      expect(el().querySelector('.prf-images img')?.getAttribute('src')).toMatch(/^blob:/);
      expect(text('.prf-images li')).toContain('Main image');

      (el().querySelector('input[formControlName="is_active"]') as HTMLInputElement).click();
      (el().querySelector('input[formControlName="is_purchasable"]') as HTMLInputElement).click();
      await settle();
      await click('button[type="submit"]');
      await csrf();

      const created = product(9, { is_active: false, images: [] });
      const post = await answer(is('POST', PRODUCTS), (r) => r.flush({ data: created }, { status: 201, statusText: 'Created' }));
      expect(post.request.body).toEqual(jasmine.objectContaining({
        slug: 'jovie-test', name_en: 'Jovie Test', name_ar: 'جوفي تجربة', is_purchasable: true, is_featured: false,
        variant: jasmine.objectContaining({ sku: 'JT-400', price_piastres: 52050, compare_at_price_piastres: 60000, initial_stock: 25 }),
      }));
      // Shown only after the image is saved.
      expect('is_active' in post.request.body).toBeFalse();

      const upload = await answer(is('POST', '/api/v1/admin/uploads/images'), (r) => r.flush({ data: { path: 'uploads/images/2026/11/a.png' } }, { status: 201, statusText: 'Created' }));
      expect(upload.request.body instanceof FormData).toBeTrue();
      const attach = await answer(is('POST', `${PRODUCTS}/9/images`), (r) =>
        r.flush({ data: { id: 901, url: '/storage/a.png', alt: { en: null, ar: null }, is_primary: true, sort_order: 0 } }, { status: 201, statusText: 'Created' }),
      );
      expect(attach.request.body).toEqual({ path: 'uploads/images/2026/11/a.png' });
      await answer(is('GET', `${PRODUCTS}/9`), (r) => r.flush({ data: { ...created, images: [{ id: 901, url: '/storage/a.png', alt: { en: null, ar: null }, is_primary: true, sort_order: 0 }] } }));
      const show = await answer(is('PATCH', `${PRODUCTS}/9`), (r) => r.flush({ data: { ...created, is_active: true } }));
      expect(show.request.body).toEqual({ is_active: true });

      await answer(is('GET', `${PRODUCTS}/9`), (r) => r.flush({ data: product(9) }));
      expect(router.url).toBe('/admin/products/9');
      expect(text('.prf-notice')).toBe('The product was created.');
    });

    it('edits an existing product: loads values, marks unsaved changes, and asks before leaving', async () => {
      await open('/admin/products/1', storeManager);
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1) }));
      expect((el().querySelector('#prf-price-input') as HTMLInputElement).value).toBe('520.50');
      expect((el().querySelector('#prf-compare') as HTMLInputElement).value).toBe('600');
      expect(text('.prf-stock-value')).toBe('Current stock: 84');
      expect(el().querySelector('#prf-initial')).toBeNull();
      expect(el().querySelector('.prf-unsaved')).toBeNull();

      await fill({ 'prf-name-en': 'Renamed' });
      expect(el().querySelector('.prf-unsaved')).not.toBeNull();

      const leaving = harness.navigateByUrl('/admin/products');
      await settle();
      expect(el().querySelector('dialog[open]')?.textContent).toContain('Leave without saving?');
      dialogButton(0).click();
      await leaving;
      expect(router.url).toBe('/admin/products/1');

      await click('button[type="submit"]');
      await csrf();
      const patch = await answer(is('PATCH', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1, { name_en: 'Renamed' }) }));
      expect(patch.request.body.name_en).toBe('Renamed');
      expect(patch.request.body.is_active).toBeTrue();
      expect(patch.request.body.variant.price_piastres).toBe(52050);
      expect(patch.request.body.variant.initial_stock).toBeUndefined();
      expect(patch.request.body.variant.stock_quantity).toBeUndefined();
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1, { name_en: 'Renamed' }) }));
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1, { name_en: 'Renamed' }) }));
      expect(text('.prf-notice')).toBe('Your changes were saved.');
      expect(el().querySelector('.prf-unsaved')).toBeNull();
    });

    it('changes the main image, reorders and removes images on save (after confirming removal)', async () => {
      const two = product(1, {
        images: [
          { id: 100, url: '/a.jpg', alt: { en: null, ar: null }, is_primary: true, sort_order: 0 },
          { id: 101, url: '/b.jpg', alt: { en: null, ar: null }, is_primary: false, sort_order: 1 },
          { id: 102, url: '/c.jpg', alt: { en: null, ar: null }, is_primary: false, sort_order: 2 },
        ],
      });
      await open('/admin/products/1', storeManager);
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: two }));
      const items = () => el().querySelectorAll('.prf-images li');
      expect(items().length).toBe(3);

      // Make the second image the main one, move the third one first, remove the first one.
      (items()[1].querySelector('.adm-link') as HTMLButtonElement).click();
      await settle();
      expect(items()[1].classList).toContain('is-primary');
      (items()[2].querySelectorAll('.prf-icon')[0] as HTMLButtonElement).click();
      await settle();
      (items()[1].querySelectorAll('.prf-icon')[0] as HTMLButtonElement).click();
      await settle();
      expect(Array.from(items()).map((li) => li.querySelector('img')!.getAttribute('src'))).toEqual(['/c.jpg', '/a.jpg', '/b.jpg']);

      (items()[1].querySelector('.prf-remove') as HTMLButtonElement).click();
      await settle();
      expect(el().querySelector('dialog[open]')?.textContent).toContain('The file itself is kept on the server.');
      dialogButton(1).click();
      await settle();
      expect(items().length).toBe(2);
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);

      await click('button[type="submit"]');
      await csrf();
      await answer(is('PATCH', `${PRODUCTS}/1`), (r) => r.flush({ data: two }));
      await answer(is('DELETE', '/api/v1/admin/product-images/100'), (r) => r.flush(null, { status: 204, statusText: 'No Content' }));
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: { ...two, images: two.images.slice(1).map((i, n) => ({ ...i, is_primary: n === 0 })) } }));
      const order = await answer(is('PUT', `${PRODUCTS}/1/images/order`), (r) => r.flush(null, { status: 204, statusText: 'No Content' }));
      expect(order.request.body).toEqual({ ids: [102, 101] });
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: two }));
    });

    it('puts the API validation messages on the fields', async () => {
      await open('/admin/products/new', storeManager);
      await fill(validNew);
      await click('button[type="submit"]');
      await csrf();
      await answer(is('POST', PRODUCTS), (r) =>
        r.flush({ message: 'x', errors: { 'variant.sku': ['The variant.sku has already been taken.'], slug: ['The slug has already been taken.'] } },
          { status: 422, statusText: 'Unprocessable' }),
      );
      expect(text('.prf-notice')).toContain('The product was not saved.');
      expect(el().querySelector('#prf-sku')?.getAttribute('aria-invalid')).toBe('true');
      expect(text('#prf-slug-err')).toBe('The slug has already been taken.');
      expect(router.url).toBe('/admin/products/new');
    });

    it('offers opening stock only to admins who manage inventory', async () => {
      await open('/admin/products/new', catalogOnly);
      expect(el().querySelector('#prf-initial')).toBeNull();
      expect(text('#prf-stock ~ .prf-help')).toContain('Stock starts at 0');
    });

    it('works in Arabic, right to left', async () => {
      await open('/admin/products/1', admin('super_admin', ALL));
      await answer(is('GET', `${PRODUCTS}/1`), (r) => r.flush({ data: product(1) }));
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('h1')).toBe('تعديل منتج');
      expect(text('label[for="prf-name-ar"]')).toContain('الاسم (بالعربية)');
      expect(el().querySelector('#prf-name-ar')?.getAttribute('dir')).toBe('rtl');
      expect(el().querySelector('#prf-sku')?.getAttribute('dir')).toBe('ltr');
    });
  });
});
