import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AuditEntry, AuditPage } from '../audit/admin-audit.service';
import { AdminNotificationItem, AdminNotificationPage } from './admin-notifications.service';
import { adminNotificationsTranslations } from './admin-notifications-translations';
import { notificationText, safeAdminLink } from './notification-text';

const ME = '/api/v1/admin/auth/me';
const N = '/api/v1/admin/notifications';
const AUDIT = '/api/v1/admin/audit-logs';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const superAdmin = admin('super_admin', [
  'admins.manage', 'settings.manage', 'content.manage', 'messages.view', 'messages.manage', 'catalog.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage',
]);
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);

const note = (id: number, o: Partial<AdminNotificationItem> = {}): AdminNotificationItem => ({
  id, category: 'orders', type: 'orders.placed', data: { order_number: `JV-261107-0000${id}`, total_piastres: 51000, payment_method: 'cod' },
  link: `/admin/orders/JV-261107-0000${id}`, read_at: null, created_at: new Date(Date.now() - 5 * 60000).toISOString(), ...o,
});
const notePage = (data: AdminNotificationItem[], unread = data.filter((n) => !n.read_at).length, current = 1, last = 1): AdminNotificationPage => ({
  data, meta: { current_page: current, last_page: last, total: data.length, unread_count: unread },
});
const entry = (id: number, o: Partial<AuditEntry> = {}): AuditEntry => ({
  id, admin: { id: 2, name: 'Store Manager' }, category: 'products', action: 'products.price_changed',
  subject: { type: 'product', id: '7', label: 'Jovie 1' },
  changes: { price_piastres: { from: 52050, to: 49900 }, is_active: { from: false, to: true } },
  created_at: '2026-11-07T10:00:00+00:00', ...o,
});
const auditPage = (data: AuditEntry[], current = 1, last = 1): AuditPage => ({
  data,
  meta: {
    current_page: current, last_page: last, total: data.length,
    options: { admins: [{ id: 2, name: 'Store Manager' }, { id: 1, name: 'Lina Admin' }], categories: ['products', 'inventory', 'orders', 'shipping', 'settings', 'reviews', 'admin_users'], subject_types: ['order', 'product'] },
  },
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin audit log and notifications', () => {
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
    http.match((r) => r.url === `${N}/unread-count`).forEach((r) => r.cancelled || r.flush({ data: { unread_count: 0 } }));
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
  const unread = (count: number) => answer(is('GET', `${N}/unread-count`), (r) => r.flush({ data: { unread_count: count } }));

  async function open(url: string, who: AdminUser): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
    await navigation;
    await settle();
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  /** The whole page, header included (the bell lives in the header, outside the routed page). */
  const doc = () => harness.fixture.nativeElement as HTMLElement;
  const norm = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
  const text = (root: HTMLElement, selector: string) => norm(root.querySelector(selector)?.textContent);
  const texts = (root: HTMLElement, selector: string) => Array.from(root.querySelectorAll(selector)).map((n) => norm(n.textContent));
  const click = async (root: HTMLElement, selector: string) => {
    (root.querySelector(selector) as HTMLElement).click();
    await settle();
  };

  async function openOverview(who = storeManager): Promise<void> {
    await open('/admin', who);
    // The overview's own figures (not under test here).
    await answer(is('GET', '/api/v1/admin/dashboard/summary'), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
  }

  describe('helpers', () => {
    it('follows only dashboard links and builds texts from the stored data', () => {
      language.addTranslations(adminNotificationsTranslations);
      expect(safeAdminLink('/admin/orders/JV-1')).toBe('/admin/orders/JV-1');
      expect(safeAdminLink('/admin/inventory')).toBe('/admin/inventory');
      for (const bad of ['https://evil.example', '//evil.example', '/jovie/shop', 'javascript:alert(1)', '/admin//x', null]) {
        expect(safeAdminLink(bad)).toBeNull();
      }
      expect(norm(notificationText(note(1), language))).toBe('New order JV-261107-00001: EGP 510, cash on delivery.');
      expect(notificationText(note(2, { category: 'inventory', type: 'inventory.low_stock', data: { name_en: 'Jovie 1', name_ar: 'جوفي 1', stock: 3, threshold: 4 } }), language))
        .toBe('“Jovie 1” is low on stock: 3 left (low-stock level 4).');
      expect(notificationText(note(3, { category: 'messages', type: 'messages.received', data: { subject: 'import-export' } }), language)).toBe('New contact message: import & export.');
      expect(notificationText(note(4, { type: 'something.new' }), language)).toBe('A new event needs your attention.');
      language.setLanguage('ar');
      expect(notificationText(note(5, { category: 'inventory', type: 'inventory.out_of_stock', data: { name_en: 'Jovie 1', name_ar: 'جوفي 1' } }), language)).toBe('«جوفي 1» نفد من المخزون.');
    });
  });

  describe('bell', () => {
    it('shows the unread count, the latest notifications, and opens one: marks it read and follows its link', async () => {
      await openOverview();
      await unread(3);
      const bell = doc().querySelector('.bell-button') as HTMLButtonElement;
      expect(text(doc(), '.bell-count')).toBe('3');
      expect(bell.getAttribute('aria-label')).toBe('Notifications, 3 unread');
      expect(bell.getAttribute('aria-expanded')).toBe('false');

      await click(doc(), '.bell-button');
      expect(bell.getAttribute('aria-expanded')).toBe('true');
      expect(doc().querySelector('.bell-panel [role="status"]')).not.toBeNull();
      const list = await answer(is('GET', N), (r) => r.flush(notePage([note(1), note(2, { read_at: '2026-11-07T09:00:00+00:00' }), note(3, { link: null, category: 'messages', type: 'messages.received', data: { subject: 'other' } })], 2)));
      expect(list.request.params.get('per_page')).toBe('8');
      const items = texts(doc(), '.bell-item');
      expect(items[0]).toContain('New order JV-261107-00001: EGP 510, cash on delivery.');
      expect(items[0]).toContain('5 minutes ago');
      expect(items[0]).toContain('Unread');
      expect(doc().querySelectorAll('.bell-list li.is-unread').length).toBe(2);
      expect(text(doc(), '.bell-count')).toBe('2');

      await click(doc(), '.bell-item');
      await csrf();
      await answer(is('POST', `${N}/1/read`), (r) => r.flush({ data: note(1, { read_at: new Date().toISOString() }), meta: { unread_count: 1 } }));
      expect(router.url).toBe('/admin/orders/JV-261107-00001');
      expect(doc().querySelector('.bell-panel')).toBeNull();
      expect(text(doc(), '.bell-count')).toBe('1');
      await answer(is('GET', '/api/v1/admin/orders/JV-261107-00001'), (r) => r.flush({}, { status: 404, statusText: 'Not Found' }));
    });

    it('marks everything read, shows empty and error states, and closes with Escape', async () => {
      await openOverview();
      await unread(2);
      await click(doc(), '.bell-button');
      await answer(is('GET', N), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(text(doc(), '.bell-panel [role="alert"]')).toContain('Try again');
      await click(doc(), '.bell-panel [role="alert"] button');
      await answer(is('GET', N), (r) => r.flush(notePage([note(1), note(2)])));

      await click(doc(), '.bell-head .bell-link');
      await csrf();
      await answer(is('POST', `${N}/read-all`), (r) => r.flush({ data: { marked: 2, unread_count: 0 } }));
      expect(doc().querySelector('.bell-count')).toBeNull();
      expect(doc().querySelectorAll('.bell-list li.is-unread').length).toBe(0);
      expect((doc().querySelector('.bell-head .bell-link') as HTMLButtonElement).disabled).toBeTrue();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();
      expect(doc().querySelector('.bell-panel')).toBeNull();
      expect(document.activeElement?.classList).toContain('bell-button');

      await click(doc(), '.bell-button');
      await answer(is('GET', N), (r) => r.flush(notePage([])));
      expect(text(doc(), '.bell-state')).toBe('You have no notifications.');
      document.body.click();
      await settle();
      expect(doc().querySelector('.bell-panel')).toBeNull();
    });

    it('speaks Arabic right to left', async () => {
      language.setLanguage('ar');
      await openOverview();
      await unread(1);
      expect(document.documentElement.dir).toBe('rtl');
      expect(doc().querySelector('.bell-button')?.getAttribute('aria-label')).toBe('الإشعارات، 1 غير مقروء');
      await click(doc(), '.bell-button');
      await answer(is('GET', N), (r) => r.flush(notePage([note(1)])));
      expect(text(doc(), '.bell-head h2')).toBe('الإشعارات');
      expect(text(doc(), '.bell-text')).toContain('طلب جديد JV-261107-00001');
    });
  });

  describe('notifications page', () => {
    it('lists, filters unread, marks one read, opens links and pages', async () => {
      await open('/admin/notifications', storeManager);
      const first = await answer(is('GET', N), (r) => r.flush(notePage([note(1), note(2, { link: null, read_at: '2026-11-07T09:00:00+00:00' })], 1, 1, 2)));
      expect(first.request.params.get('per_page')).toBe('20');
      expect(text(el(), 'main h1')).toBe('Notifications');
      const rows = el().querySelectorAll('.ntf-list li');
      expect(rows.length).toBe(2);
      expect(rows[1].querySelector('.adm-button')).toBeNull(); // no link: no "Open"
      expect(rows[1].querySelector('.adm-link')).toBeNull(); // already read

      await click(el(), '.ntf-list li .adm-link');
      await csrf();
      await answer(is('POST', `${N}/1/read`), (r) => r.flush({ data: note(1, { read_at: new Date().toISOString() }), meta: { unread_count: 0 } }));
      expect(el().querySelectorAll('.ntf-list li.is-unread').length).toBe(0);

      const select = el().querySelector('#ntf-show') as HTMLSelectElement;
      select.value = 'unread';
      select.dispatchEvent(new Event('change'));
      await settle();
      const unreadOnly = await answer(is('GET', N), (r) => r.flush(notePage([], 0, 1, 1)));
      expect(unreadOnly.request.params.get('unread')).toBe('1');
      expect(text(el(), 'app-admin-state')).toBe('You have no unread notifications.');

      select.value = 'all';
      select.dispatchEvent(new Event('change'));
      await settle();
      await answer(is('GET', N), (r) => r.flush(notePage([note(1, { read_at: '2026-11-07T09:00:00+00:00' })], 0, 1, 2)));
      await click(el(), '.ntf-pages button:last-child');
      const second = await answer(is('GET', N), (r) => r.flush(notePage([note(9, { read_at: '2026-11-07T09:00:00+00:00' })], 0, 2, 2)));
      expect(second.request.params.get('page')).toBe('2');

      await click(el(), '.ntf-list li .adm-button');
      expect(router.url).toBe('/admin/orders/JV-261107-00009');
      await answer(is('GET', '/api/v1/admin/orders/JV-261107-00009'), (r) => r.flush({}, { status: 404, statusText: 'Not Found' }));
    });

    it('shows the error state with a retry', async () => {
      await open('/admin/notifications', storeManager);
      await answer(is('GET', N), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click(el(), 'app-admin-state button');
      await answer(is('GET', N), (r) => r.flush(notePage([])));
      expect(text(el(), 'app-admin-state')).toBe('You have no notifications.');
    });
  });

  describe('audit log', () => {
    it('is only for admins who manage admins', async () => {
      await open('/admin/audit-log', storeManager);
      expect(router.url).toBe('/admin/forbidden');
      expect(doc().querySelector('.adm-side a[href="/admin/audit-log"]')).toBeNull();
    });

    it('lists entries, filters on the server, and shows safe before/after details', async () => {
      await open('/admin/audit-log', superAdmin);
      expect(doc().querySelector('.adm-side a[href="/admin/audit-log"]')?.classList).toContain('is-active');
      const first = await answer(is('GET', AUDIT), (r) => r.flush(auditPage([
        entry(2),
        entry(1, { admin: { id: null, name: 'Old Admin' }, category: 'orders', action: 'orders.cancelled', subject: { type: 'order', id: '9', label: 'JV-1' }, changes: {} }),
      ])));
      expect(first.request.params.get('per_page')).toBe('25');
      expect(text(el(), '#aud-results')).toBe('Entries: 2');
      const rows = Array.from(el().querySelectorAll('.aud-table > tbody > tr:first-child'));
      // Each cell's parts (elements and text) joined by single spaces.
      const cells = (i: number) => Array.from(rows[i].querySelectorAll('td')).map((td) => Array.from(td.children).map((c) => norm(c.textContent)).join(' ') || norm(td.textContent));
      expect(cells(0).slice(1, 3)).toEqual(['Store Manager', 'Products Price changed']);
      expect(norm(rows[0].querySelectorAll('td')[3].textContent)).toBe('Product: Jovie 1');
      expect(cells(0)[0]).toContain('2026');
      expect(cells(1)[1]).toBe('Old Admin account no longer exists');
      expect(cells(1)[2]).toBe('Orders Order cancelled');

      const toggle = rows[0].querySelector('.aud-actions button') as HTMLButtonElement;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      toggle.click();
      await settle();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      const changes = Array.from(el().querySelectorAll('.aud-changes tbody tr')).map((tr) => Array.from(tr.children).map((c) => norm(c.textContent)));
      expect(changes).toEqual([['price_piastres', 'EGP 520.50', 'EGP 499'], ['is_active', 'No', 'Yes']]);
      (rows[1].querySelector('.aud-actions button') as HTMLButtonElement).click();
      await settle();
      expect(text(el(), '.aud-details .aud-note')).toBe('No field values were recorded for this action.');
      expect(el().querySelectorAll('.aud-details').length).toBe(1);

      (el().querySelector('#aud-search') as HTMLInputElement).value = 'jovie';
      (el().querySelector('#aud-admin') as HTMLSelectElement).value = '2';
      (el().querySelector('#aud-category') as HTMLSelectElement).value = 'products';
      (el().querySelector('#aud-type') as HTMLSelectElement).value = 'product';
      (el().querySelector('#aud-from') as HTMLInputElement).value = '2026-11-01';
      (el().querySelector('#aud-to') as HTMLInputElement).value = '2026-11-07';
      (el().querySelector('form.aud-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle();
      const filtered = await answer(is('GET', AUDIT), (r) => r.flush(auditPage([], 1, 1)));
      expect(['search', 'admin_id', 'category', 'subject_type', 'from', 'to'].map((k) => filtered.request.params.get(k)))
        .toEqual(['jovie', '2', 'products', 'product', '2026-11-01', '2026-11-07']);
      expect(text(el(), 'app-admin-state')).toBe('No entry matches these filters.');
      expect(el().querySelectorAll('main button[class*="delete"], main [aria-label*="Delete"]').length).toBe(0);

      await click(el(), '.aud-buttons .adm-link');
      await answer(is('GET', AUDIT), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click(el(), 'app-admin-state button');
      await answer(is('GET', AUDIT), (r) => r.flush(auditPage([entry(1)], 1, 2)));
      await click(el(), '.aud-pages button:last-child');
      const second = await answer(is('GET', AUDIT), (r) => r.flush(auditPage([entry(3)], 2, 2)));
      expect(second.request.params.get('page')).toBe('2');
    });

    it('switches to cards on narrow panels and speaks Arabic', async () => {
      language.setLanguage('ar');
      await open('/admin/audit-log', superAdmin);
      await answer(is('GET', AUDIT), (r) => r.flush(auditPage([entry(1)])));
      expect(text(el(), 'main h1')).toBe('سجل النشاط');
      expect(text(el(), '.aud-table > tbody td:nth-child(3)')).toContain('تغيير السعر');
      const panel = el().querySelector('.aud-panel') as HTMLElement;
      panel.style.width = '1000px';
      expect(getComputedStyle(el().querySelector('.aud-table > thead')!).display).toBe('table-header-group');
      panel.style.width = '400px';
      expect(getComputedStyle(el().querySelector('.aud-table > thead')!).display).toBe('none');
    });
  });
});
