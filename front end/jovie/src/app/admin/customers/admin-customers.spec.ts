import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { OrderListPage, OrderListRow } from '../orders/admin-orders.models';
import { CustomerDetails, CustomerPage, CustomerRow } from './admin-customers.models';

const ME = '/api/v1/admin/auth/me';
const CUSTOMERS = '/api/v1/admin/customers';
const ORDERS = '/api/v1/admin/orders';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);
const editor = admin('content_editor', ['content.manage', 'messages.view', 'reviews.manage']);

const customer = (id: number, o: Partial<CustomerRow> = {}): CustomerRow => ({
  id, first_name: `First${id}`, last_name: `Last${id}`, email: `c${id}@example.com`, phone: `+20101234567${id}`, locale: 'en',
  is_active: true, email_verified: true, last_login_at: '2026-11-04T10:00:00+00:00', created_at: '2026-11-01T10:00:00+00:00',
  orders_count: 0, paid_total: { amount_piastres: 0, currency: 'EGP' }, last_order_at: null, ...o,
});
const page = (data: CustomerRow[], current = 1, last = 1, total = data.length): CustomerPage => ({ data, meta: { current_page: current, last_page: last, total } });
const mona = customer(1, {
  first_name: 'Mona', last_name: 'Hassan', email: 'mona@example.com', phone: '+201012345678',
  orders_count: 2, paid_total: { amount_piastres: 66000, currency: 'EGP' }, last_order_at: '2026-11-05T12:00:00+00:00',
});
const details = (o: Partial<CustomerDetails> = {}): CustomerDetails => ({
  ...mona,
  addresses: [
    {
      id: 7, label: 'Home', recipient_name: 'Mona Hassan', phone: '+201012345678', governorate_id: 1, city: 'Nasr City', area: 'District 7',
      street: '12 Abbas El Akkad', building: '7', floor: '3', apartment: '12', landmark: 'Near the pharmacy', postal_code: null, is_default: true,
      governorate: { id: 1, code: 'EG-C', name: { en: 'Cairo', ar: 'القاهرة' } },
    },
  ],
  ...o,
});
const order = (n: number, o: Partial<OrderListRow> = {}): OrderListRow => ({
  id: n, order_number: `JV-261105-0000${n}`, status: 'delivered', payment_status: 'paid', payment_method: 'cod',
  customer: { first_name: 'Mona', last_name: 'Hassan', phone: '+201012345678' }, items_count: 2, lines_count: 1,
  total: { amount_piastres: 66000, currency: 'EGP' }, governorate: { id: 1, en: 'Cairo', ar: 'القاهرة' }, refund_review: false,
  placed_at: '2026-11-05T12:00:00+00:00', updated_at: null, ...o,
});
const orderPage = (data: OrderListRow[], current = 1, last = 1): OrderListPage => ({
  data, meta: { current_page: current, last_page: last, total: data.length }, options: { governorates: [] },
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin customers', () => {
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
  const setValue = (selector: string, value: string) => {
    (el().querySelector(selector) as HTMLInputElement | HTMLSelectElement).value = value;
  };
  const submitFilters = async () => {
    (el().querySelector('form.cus-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  };

  async function openList(rows: CustomerRow[] = [mona, customer(2, { is_active: false, email_verified: false, phone: null })], who = support) {
    await open('/admin/customers', who);
    return answer(is('GET', CUSTOMERS), (r) => r.flush(page(rows)));
  }

  async function openCustomer(who = support, data = details()) {
    await open('/admin/customers/1', who);
    await answer(is('GET', `${CUSTOMERS}/1`), (r) => r.flush({ data }));
  }

  describe('access', () => {
    it('sends admins without customers.view to the 403 page and hides the link', async () => {
      await open('/admin/customers', editor);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/customers"]')).toBeNull();
      await harness.navigateByUrl('/admin/customers/1');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
    });

    it('sends signed-out visitors to the admin login', async () => {
      await open('/admin/customers/1', null);
      expect(router.url).toBe('/admin/login');
    });

    it('shows Customers as built in the sidebar for permitted admins', async () => {
      await openList();
      const link = el().querySelector('.adm-side a[href="/admin/customers"]');
      expect(link?.classList).toContain('is-active');
      expect(link?.querySelector('.adm-soon')).toBeNull();
    });
  });

  describe('list', () => {
    it('shows a loading state, then customers with their order figures and status, and nothing to edit', async () => {
      await open('/admin/customers', support);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      const request = await answer(is('GET', CUSTOMERS), (r) => r.flush(page([mona, customer(2, { is_active: false, email_verified: false, phone: null })], 1, 1, 2)));
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('per_page')).toBe('20');

      expect(text('#cus-results')).toBe('Customers: 2');
      const rows = el().querySelectorAll('.cus-table tbody tr');
      expect(rows.length).toBe(2);
      const cells = (i: number) => Array.from(rows[i].querySelectorAll('td')).map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(cells(0).slice(0, 6)).toEqual(['Mona Hassanmona@example.com', '+201012345678', '1 Nov 2026', '2', 'EGP 660', 'Active']);
      expect(cells(1)[1]).toBe('No phone');
      expect(texts('.cus-table tbody tr:nth-child(2) td:nth-child(6) span')).toEqual(['Deactivated', 'Email not verified']);
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/customers/1');
      expect(rows[0].querySelector('.cus-actions a')?.getAttribute('aria-label')).toBe('View customer Mona Hassan');
      expect(text('.adm-panel-lead')).toContain('before refunds');
      expect(el().querySelectorAll('main dialog, main input[type="checkbox"]').length).toBe(0);
    });

    it('searches and filters on the server, and clears', async () => {
      await openList();
      setValue('#cus-search', ' mona hassan ');
      setValue('#cus-status', 'inactive');
      setValue('#cus-from', '2026-11-01');
      setValue('#cus-to', '2026-11-03');
      await submitFilters();
      const filtered = await answer(is('GET', CUSTOMERS), (r) => r.flush(page([])));
      expect(filtered.request.params.get('search')).toBe('mona hassan');
      expect(filtered.request.params.get('status')).toBe('inactive');
      expect(filtered.request.params.get('registered_from')).toBe('2026-11-01');
      expect(filtered.request.params.get('registered_to')).toBe('2026-11-03');
      expect(text('app-admin-state')).toBe('No customer matches these filters.');

      await click('.cus-buttons .adm-link');
      const cleared = await answer(is('GET', CUSTOMERS), (r) => r.flush(page([mona])));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page']);
      expect((el().querySelector('#cus-search') as HTMLInputElement).value).toBe('');
    });

    it('pages, and shows error and empty states with a retry', async () => {
      await open('/admin/customers', support);
      await answer(is('GET', CUSTOMERS), (r) => r.flush(page([mona], 1, 3, 41)));
      expect(text('.cus-pages span')).toBe('Page 1 of 3');
      await click('.cus-pages button:last-child');
      const second = await answer(is('GET', CUSTOMERS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      const retried = await answer(is('GET', CUSTOMERS), (r) => r.flush(page([])));
      expect(retried.request.params.get('page')).toBe('2');
      expect(text('app-admin-state')).toBe('No customer accounts yet.');
    });

    it('switches the table to cards on narrow panels', async () => {
      await openList();
      const panel = el().querySelector('.cus-panel') as HTMLElement;
      panel.style.width = '1100px';
      expect(getComputedStyle(el().querySelector('.cus-table thead')!).display).toBe('table-header-group');
      panel.style.width = '420px';
      expect(getComputedStyle(el().querySelector('.cus-table thead')!).display).toBe('none');
    });

    it('shows Arabic texts right to left with phones and emails kept left to right', async () => {
      language.setLanguage('ar');
      await openList();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('main h1')).toBe('العملاء');
      expect(text('#cus-results')).toContain('العملاء:');
      const row = el().querySelector('.cus-table tbody tr')!;
      expect(row.querySelector('.cus-email bdi')?.getAttribute('dir')).toBe('ltr');
      expect(row.querySelectorAll('td')[1].querySelector('bdi')?.getAttribute('dir')).toBe('ltr');
      expect(text('.cus-table tbody tr .cus-badge')).toBe('نشط');
    });
  });

  describe('details', () => {
    it('shows account details, order figures and saved addresses, read-only', async () => {
      await openCustomer();
      await answer(is('GET', ORDERS), (r) => r.flush(orderPage([order(1)])));
      expect(text('main h1')).toBe('Mona Hassan');
      expect(text('.cst-badge')).toBe('Active');
      const details = Array.from(el().querySelectorAll('.cst-dl div')).map((d) => `${d.querySelector('dt')!.textContent!.trim()}: ${d.querySelector('dd')!.textContent!.trim()}`);
      expect(details).toContain('Phone: +201012345678');
      expect(details).toContain('Email verified: Yes');
      expect(details).toContain('Preferred language: English');
      expect(texts('.adm-stat-value')).toEqual(['2', 'EGP 660', '5 Nov 2026']);
      expect(text('.cst-note')).toContain('not available in the dashboard yet');
      expect(texts('.cst-addresses li p')).toEqual([
        'HomeDefault', 'Mona Hassan · +201012345678', '12 Abbas El Akkad, 7, 3, 12', 'District 7, Nasr City, Cairo', 'Near the pharmacy',
      ]);
      expect(el().querySelectorAll('main button:not(app-admin-state button), main dialog').length).toBe(0);
    });

    it('lists the order history from the orders API and links to the existing order page', async () => {
      await openCustomer();
      const history = await answer(is('GET', ORDERS), (r) =>
        r.flush(orderPage([order(2, { status: 'pending_confirmation', payment_status: 'unpaid', total: { amount_piastres: 51000, currency: 'EGP' } }), order(1)], 1, 2)),
      );
      expect(history.request.params.get('customer_id')).toBe('1');
      expect(history.request.params.get('per_page')).toBe('10');
      const rows = el().querySelectorAll('.cst-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].textContent!.replace(/\s+/g, ' ')).toContain('Awaiting confirmation');
      expect(rows[0].textContent!.replace(/\s+/g, ' ')).toContain('Not paid · Cash on delivery');
      expect(rows[0].textContent!.replace(/\s+/g, ' ')).toContain('EGP 510');
      expect(rows[1].textContent).toContain('Delivered');

      await click('.cst-pages button:last-child');
      const second = await answer(is('GET', ORDERS), (r) => r.flush(orderPage([order(3)], 2, 2)));
      expect(second.request.params.get('page')).toBe('2');

      const link = el().querySelector('.cst-table tbody a') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/admin/orders/JV-261105-00003');
      link.click();
      await settle();
      expect(router.url).toBe('/admin/orders/JV-261105-00003');
      await answer(is('GET', `${ORDERS}/JV-261105-00003`), (r) => r.flush({}, { status: 404, statusText: 'Not Found' }));
    });

    it('shows empty and error order history states with a retry', async () => {
      await openCustomer(support, details({ addresses: [] }));
      expect(text('#cst-addresses + p + app-admin-state')).toBe('No saved addresses.');
      await answer(is('GET', ORDERS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('.cst-history app-admin-state [role="alert"]')).not.toBeNull();
      await click('.cst-history app-admin-state button');
      await answer(is('GET', ORDERS), (r) => r.flush(orderPage([])));
      expect(text('.cst-history app-admin-state')).toBe('This customer has no orders yet.');
    });

    it('does not request orders for an admin who cannot view them', async () => {
      await openCustomer(admin('support', ['customers.view']));
      expect(text('.cst-history')).toContain('Your role cannot view orders');
      http.expectNone((r) => r.url === ORDERS);
    });

    it('explains a deactivated account', async () => {
      await openCustomer(support, details({ is_active: false }));
      await answer(is('GET', ORDERS), (r) => r.flush(orderPage([])));
      expect(text('.cst-badge')).toBe('Deactivated');
      expect(text('.cst-warning')).toContain('cannot sign in or place orders');
    });

    it('shows not-found and error states', async () => {
      await open('/admin/customers/99', support);
      await answer(is('GET', `${CUSTOMERS}/99`), (r) => r.flush({ message: 'Not found.' }, { status: 404, statusText: 'Not Found' }));
      expect(text('app-admin-state')).toContain('This customer was not found');

      await harness.navigateByUrl('/admin/customers/abc');
      await settle();
      expect(text('app-admin-state')).toContain('This customer was not found');

      await harness.navigateByUrl('/admin/customers/5');
      await answer(is('GET', `${CUSTOMERS}/5`), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', `${CUSTOMERS}/5`), (r) => r.flush({ data: details({ id: 5 }) }));
      await answer(is('GET', ORDERS), (r) => r.flush(orderPage([])));
      expect(text('main h1')).toBe('Mona Hassan');
    });

    it('shows Arabic texts', async () => {
      language.setLanguage('ar');
      await openCustomer();
      await answer(is('GET', ORDERS), (r) => r.flush(orderPage([order(1)])));
      expect(text('.cst-back')).toBe('→ كل العملاء');
      expect(text('#cst-history')).toBe('سجل الطلبات');
      expect(text('.cst-table tbody tr')).toContain('تم التسليم');
      expect(texts('.cst-addresses li p')[3]).toBe('District 7، Nasr City، القاهرة');
    });
  });
});
