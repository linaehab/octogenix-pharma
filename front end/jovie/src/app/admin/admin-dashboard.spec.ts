import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../core/i18n/language.service';
import { AdminUser } from './admin-auth.service';
import { DashboardSummary } from './admin-dashboard.service';
import { AdminPermission, adminCan } from './admin-permissions';

const ME = '/api/v1/admin/auth/me';
const SUMMARY = '/api/v1/admin/dashboard/summary';

/** The role permissions of App\Enums\AdminRole. */
const ROLE_PERMISSIONS: Record<AdminUser['role'], AdminPermission[]> = {
  super_admin: [
    'admins.manage', 'settings.manage', 'content.manage', 'messages.view', 'messages.manage', 'catalog.manage', 'inventory.manage',
    'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage',
  ],
  store_manager: ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage'],
  support: ['messages.view', 'messages.manage', 'orders.view', 'customers.view'],
  content_editor: ['content.manage', 'messages.view', 'reviews.manage'],
};

const adminWith = (role: AdminUser['role'], overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 1,
  name: 'Lina Admin',
  email: 'lina@example.com',
  role,
  is_active: true,
  locale: 'en',
  permissions: ROLE_PERMISSIONS[role],
  last_login_at: null,
  created_at: null,
  ...overrides,
});

const totals = (amount: number, count: number) => ({ amount_piastres: amount, orders_count: count });
const fullSummary = (): DashboardSummary => ({
  generated_at: '2026-11-06T10:00:00+00:00',
  timezone: 'Africa/Cairo',
  currency: 'EGP',
  test_mode: false,
  orders: {
    total: 5,
    by_status: { pending_payment: 0, pending_confirmation: 1, confirmed: 0, processing: 1, shipped: 0, delivered: 2, cancelled: 0, expired: 0, returned: 1 },
  },
  sales: {
    paid_revenue: {
      today: { from: '', ...totals(10000, 1), refund_review: totals(0, 0) },
      last_7_days: { from: '', ...totals(40000, 2), refund_review: totals(0, 0) },
      last_30_days: { from: '', ...totals(80000, 3), refund_review: totals(40000, 1) },
    },
    delivered_value: {
      today: { from: '', ...totals(20000, 1), not_collected: totals(20000, 1) },
      last_7_days: { from: '', ...totals(50000, 2), not_collected: totals(20000, 1) },
      last_30_days: { from: '', ...totals(50000, 2), not_collected: totals(20000, 1) },
    },
    refunds_recorded: false,
  },
  reviews: { pending: 6 },
  messages: { new: 2 },
  inventory: { low_stock: 1, out_of_stock: 0, without_threshold: 3 },
});

const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('adminCan', () => {
  it('needs an active admin and every listed permission, or one of them in "any" mode', () => {
    const support = adminWith('support');
    expect(adminCan(support, { permissions: [] })).toBeTrue();
    expect(adminCan(support, { permissions: ['orders.view'] })).toBeTrue();
    expect(adminCan(support, { permissions: ['orders.view', 'payments.manage'] })).toBeFalse();
    expect(adminCan(support, { permissions: ['shipping.manage', 'settings.manage'], mode: 'any' })).toBeFalse();
    expect(adminCan(adminWith('store_manager'), { permissions: ['shipping.manage', 'settings.manage'], mode: 'any' })).toBeTrue();
    expect(adminCan(adminWith('super_admin', { is_active: false }), { permissions: [] })).toBeFalse();
    expect(adminCan(null, { permissions: [] })).toBeFalse();
  });
});

describe('Admin dashboard', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let language: LanguageService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin', loadChildren: () => import('./admin.routes').then((m) => m.adminRoutes) }]),
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

  /** Waits for a request to `url` (navigation and lazy loading are asynchronous) and answers it. */
  async function answer(url: string, respond: (request: TestRequest) => void): Promise<void> {
    for (let i = 0; i < 100; i++) {
      const requests = http.match((r) => r.url === url);
      if (requests.length) {
        requests.forEach(respond);
        await settle();
        return;
      }
      await sleep();
    }
    fail(`No request to ${url}`);
  }

  /** Lets pending work run and renders. (Not whenStable: the requests' timeout() timers keep the zone busy.) */
  async function settle(): Promise<void> {
    for (let i = 0; i < 10; i++) {
      await sleep();
      harness.fixture.detectChanges();
    }
  }

  /** Opens a dashboard address as `admin` (null: signed out) and answers the session check. */
  async function open(url: string, admin: AdminUser | null): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(ME, (r) => (admin ? r.flush({ data: admin }) : r.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' })));
    await navigation;
    await settle();
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  const text = (selector: string) => (el().querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const navLabels = () => Array.from(el().querySelectorAll('.adm-side li a span')).map((s) => s.textContent?.trim());

  it('sends signed-out visitors to the admin login, which still works', async () => {
    await open('/admin', null);
    expect(router.url).toBe('/admin/login');
    expect(el().querySelector('#adm-email')).not.toBeNull();
    expect(el().querySelector('.adm-side')).toBeNull();
  });

  it('sends signed-out visitors from a section address to the login too', async () => {
    await open('/admin/orders', null);
    expect(router.url).toBe('/admin/login');
  });

  it('keeps the forgot-password and set-password pages reachable without signing in', async () => {
    await harness.navigateByUrl('/admin/forgot-password');
    await settle();
    expect(router.url).toBe('/admin/forgot-password');
    expect(el().querySelector('.adm-top')).not.toBeNull();
    expect(el().querySelector('form')).not.toBeNull();

    await harness.navigateByUrl('/admin/reset-password?token=abc&email=lina%40example.com');
    await settle();
    expect(router.url).toContain('/admin/reset-password');
    expect(el().querySelector('.adm-top')).not.toBeNull();
  });

  it('shows each role only the sections its permissions allow', async () => {
    const expected: Record<AdminUser['role'], string[]> = {
      super_admin: [
        'Overview', 'Products', 'Inventory', 'Discounts & promo codes', 'Orders', 'Sales & reports', 'Contact messages', 'Reviews',
        'Customers', 'Shipping & store settings', 'Admin users', 'Audit log',
      ],
      store_manager: ['Overview', 'Products', 'Inventory', 'Discounts & promo codes', 'Orders', 'Sales & reports', 'Reviews', 'Customers', 'Shipping & store settings'],
      support: ['Overview', 'Orders', 'Contact messages', 'Customers'],
      content_editor: ['Overview', 'Contact messages', 'Reviews'],
    };
    for (const role of Object.keys(expected) as AdminUser['role'][]) {
      // A fresh session check for every role.
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([{ path: 'admin', loadChildren: () => import('./admin.routes').then((m) => m.adminRoutes) }]),
        ],
      });
      http = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      language = TestBed.inject(LanguageService);
      harness = await RouterTestingHarness.create();

      await open('/admin/forbidden', adminWith(role));
      expect(navLabels()).withContext(role).toEqual(expected[role]);
    }
  });

  it('blocks a typed address outside the role with the 403 page', async () => {
    await open('/admin/products', adminWith('support'));
    expect(router.url).toBe('/admin/forbidden');
    expect(text('h1')).toBe('You do not have access to this section');
    expect(el().querySelector('a[href="/admin"]')).not.toBeNull();

    await harness.navigateByUrl('/admin/admin-users');
    await settle();
    expect(router.url).toBe('/admin/forbidden');
  });

  it('opens a permitted future section as a plain "not built yet" page without actions', async () => {
    // Contact messages is still a later phase (Products, Inventory and Orders are built).
    await open('/admin/messages', adminWith('support'));
    expect(router.url).toBe('/admin/messages');
    expect(text('main h1')).toBe('Contact messages');
    expect(text('main')).toContain('Not built yet');
    expect(el().querySelectorAll('main button, main a, main input, main form').length).toBe(0);
    expect(el().querySelector('.adm-side a.is-active')?.getAttribute('aria-current')).toBe('page');
  });

  it('opens the shipping and settings section with either of its permissions', async () => {
    // Its pages are covered in settings/admin-settings.spec.ts; here only the section entry.
    await open('/admin/settings', adminWith('store_manager'));
    expect(router.url).toBe('/admin/settings/shipping');
    await answer('/api/v1/admin/governorates', (r) => r.flush({ data: [] }));
  });

  it('shows the header with the admin name and role', async () => {
    await open('/admin/forbidden', adminWith('store_manager'));
    expect(text('.adm-user-name')).toBe('Lina Admin');
    expect(text('.adm-user-role')).toBe('Store manager');
  });

  it('loads the overview: loading state, then the real figures with paid and delivered kept apart', async () => {
    await open('/admin', adminWith('super_admin'));
    expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();

    await answer(SUMMARY, (r) => r.flush({ data: fullSummary() }));
    const page = text('main');
    expect(page).toContain('Paid revenue (collected)');
    expect(page).toContain('Delivered orders value');
    expect(text('#adm-paid + p + .adm-grid')).toContain('EGP 100');
    expect(text('#adm-delivered + p + .adm-grid')).toContain('EGP 200');
    expect(page).toContain('EGP 400 of it from orders later cancelled or returned (orders: 1)');
    expect(page).toContain('EGP 200 not yet recorded as collected (orders: 1)');
    expect(page).toContain('Refunds are not recorded in the system yet');
    expect(page).toContain('Reviews awaiting approval');
    expect(page).toContain('Without a low-stock level: 3');
    expect(text('.adm-status-list')).toContain('Delivered');
    expect(el().querySelector('app-admin-state')).toBeNull();
  });

  it('shows only the blocks the API returned for the role', async () => {
    await open('/admin', adminWith('support'));
    const summary = fullSummary();
    delete summary.sales;
    delete summary.reviews;
    delete summary.inventory;
    await answer(SUMMARY, (r) => r.flush({ data: summary }));
    const page = text('main');
    expect(page).toContain('Orders by status');
    expect(page).toContain('New contact messages');
    expect(page).not.toContain('Paid revenue');
    expect(page).not.toContain('Reviews awaiting approval');
    expect(page).not.toContain('Products low on stock');
  });

  it('shows an empty state when there are no orders', async () => {
    await open('/admin', adminWith('support'));
    const summary = fullSummary();
    summary.orders = { total: 0, by_status: { pending_payment: 0 } };
    await answer(SUMMARY, (r) => r.flush({ data: summary }));
    expect(text('#adm-orders + app-admin-state')).toBe('No orders yet.');
    expect(el().querySelector('.adm-status-list')).toBeNull();
  });

  it('shows an error state with a retry that loads the figures again', async () => {
    await open('/admin', adminWith('super_admin'));
    await answer(SUMMARY, (r) => r.flush({ message: 'Server Error' }, { status: 500, statusText: 'Server Error' }));
    expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();

    (el().querySelector('app-admin-state button') as HTMLButtonElement).click();
    await answer(SUMMARY, (r) => r.flush({ data: fullSummary() }));
    expect(el().querySelector('app-admin-state [role="alert"]')).toBeNull();
    expect(text('main')).toContain('Paid revenue (collected)');
  });

  it('returns to the login when the session has ended', async () => {
    await open('/admin', adminWith('super_admin'));
    await answer(SUMMARY, (r) => r.flush({ message: 'Unauthenticated.' }, { status: 401, statusText: 'Unauthorized' }));
    await settle();
    expect(router.url).toBe('/admin/login');
  });

  it('switches to Arabic and right-to-left', async () => {
    await open('/admin/forbidden', adminWith('content_editor'));
    (el().querySelector('.adm-head-actions > button.adm-head-button:not(.is-strong)') as HTMLButtonElement).click();
    await settle();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
    expect(navLabels()).toEqual(['نظرة عامة', 'رسائل التواصل', 'التقييمات']);
    expect(text('h1')).toBe('لا تملك صلاحية الوصول إلى هذا القسم');
    expect(text('.adm-user-role')).toBe('محرر محتوى');
  });

  it('logs out through the existing service and returns to the login', async () => {
    await open('/admin/forbidden', adminWith('support'));
    (el().querySelector('.adm-head-button.is-strong') as HTMLButtonElement).click();
    await answer('/sanctum/csrf-cookie', (r) => r.flush(null));
    await answer('/api/v1/admin/auth/logout', (r) => r.flush(null, { status: 204, statusText: 'No Content' }));
    await settle();
    expect(router.url).toBe('/admin/login');
    expect(el().querySelector('.adm-side')).toBeNull();
  });

  it('opens and closes the menu drawer from the header', async () => {
    await open('/admin/forbidden', adminWith('support'));
    const toggle = el().querySelector('.adm-menu-toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await settle();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(el().querySelector('.adm-side')?.classList).toContain('is-open');
    expect(document.body.classList).toContain('adm-menu-open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.classList).not.toContain('adm-menu-open');
    expect(document.activeElement).toBe(toggle);
  });
});
