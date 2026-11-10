import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AdminUserPage } from './admin-users.service';

const ME = '/api/v1/admin/auth/me';
const USERS = '/api/v1/admin/admin-users';
const ALL: AdminPermission[] = [
  'admins.manage', 'settings.manage', 'content.manage', 'messages.view', 'messages.manage', 'catalog.manage', 'inventory.manage',
  'orders.view', 'orders.manage', 'payments.manage', 'payments.record_cod', 'customers.view', 'shipping.manage', 'reviews.manage',
];
const account = (id: number, o: Partial<AdminUser> = {}): AdminUser => ({
  id, name: `Admin ${id}`, email: `admin${id}@example.com`, role: 'support', is_active: true, locale: 'en', permissions: [],
  last_login_at: null, created_at: '2026-11-01T08:00:00+00:00', updated_at: '2026-11-01T08:00:00+00:00', ...o,
});
const me = account(1, { name: 'Lina', email: 'lina@example.com', role: 'super_admin', permissions: ALL, last_login_at: '2026-11-08T08:00:00+00:00' });
const page = (data: AdminUser[], current = 1, last = 1, activeSuperAdmins = 1): AdminUserPage => ({
  data,
  meta: { current_page: current, last_page: last, total: data.length, roles: ['super_admin', 'store_manager', 'product_manager', 'order_manager', 'content_manager', 'content_editor', 'support'], active_super_admins: activeSuperAdmins },
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin users', () => {
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

  async function open(who: AdminUser, rows: AdminUser[] = [me, account(2)], activeSuperAdmins = 1): Promise<TestRequest> {
    const navigation = harness.navigateByUrl('/admin/users');
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
    await navigation;
    await settle();
    return answer(is('GET', USERS), (r) => r.flush(page(rows, 1, 1, activeSuperAdmins)));
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
  const rowActions = (index: number) => texts(`.usr-table tbody tr:nth-child(${index}) .usr-row-actions button, .usr-table tbody tr:nth-child(${index}) .usr-row-actions .usr-muted`);

  describe('list', () => {
    it('shows name, email, role, status, dates and the actions allowed for each account', async () => {
      const first = await open(me, [me, account(2, { role: 'order_manager', last_login_at: '2026-11-07T10:00:00+00:00' }), account(3, { is_active: false, role: 'product_manager' })]);
      expect(first.request.params.get('sort')).toBe('name');
      expect(router.url).toBe('/admin/users');

      const rows = el().querySelectorAll('.usr-table tbody tr');
      expect(rows.length).toBe(3);
      expect(rows[0].textContent).toContain('You');
      expect(rows[0].textContent).toContain('lina@example.com');
      expect(rows[1].textContent).toContain('Order manager');
      expect(rows[2].textContent).toContain('Product manager');
      expect(rows[2].textContent).toContain('Deactivated');
      expect(rows[1].textContent).not.toContain('Never');
      expect(rows[2].textContent).toContain('Never');
      expect(rowActions(1)).toEqual(['Edit'], 'Your own account cannot be deactivated here.');
      expect(rowActions(2)).toEqual(['Edit', 'Deactivate']);
      expect(rowActions(3)).toEqual(['Edit', 'Reactivate']);
      expect(document.body.textContent).not.toContain('password_hash');
      const side = el().querySelector('.adm-side a[href="/admin/users"]');
      expect(side?.querySelector('.adm-soon')).toBeNull();
    });

    it('marks the only active super admin, who cannot be deactivated', async () => {
      await open(me, [me, account(2, { role: 'super_admin' })], 2);
      expect(rowActions(2)).toEqual(['Edit', 'Deactivate']);
      await harness.navigateByUrl('/admin/users?again=1');
      await settle();
    });

    it('sends search, filters and sort to the API, pages, retries and clears', async () => {
      await open(me, [me]);
      const set = (selector: string, value: string) => ((el().querySelector(selector) as HTMLInputElement | HTMLSelectElement).value = value);
      set('#usr-search', 'omar');
      set('#usr-filter-role', 'order_manager');
      set('#usr-filter-status', 'inactive');
      set('#usr-sort', 'last_login');
      (el().querySelector('form.usr-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', USERS), (r) => r.flush(page([])));
      expect(['search', 'role', 'status', 'sort', 'page'].map((k) => filtered.request.params.get(k))).toEqual(['omar', 'order_manager', 'inactive', 'last_login', '1']);
      expect(text('app-admin-state')).toBe('No admin matches these filters.');

      await click('.usr-buttons .adm-link');
      const cleared = await answer(is('GET', USERS), (r) => r.flush(page([me], 1, 2)));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page', 'sort']);
      await click('.usr-pages button:last-child');
      const second = await answer(is('GET', USERS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', USERS), (r) => r.flush(page([])));
      expect(text('app-admin-state')).toBe('No admin accounts were found.');
    });

    it('is closed to admins without admins.manage', async () => {
      const navigation = harness.navigateByUrl('/admin/users');
      await answer(is('GET', ME), (r) => r.flush({ data: account(5, { role: 'store_manager', permissions: ['catalog.manage', 'orders.view'] }) }));
      await navigation;
      await settle();
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/users"]')).toBeNull();
    });
  });

  describe('accounts', () => {
    it('creates an account without any password and says plainly that the invitation was not delivered', async () => {
      await open(me, [me]);
      await click('.usr-head-actions button');
      expect(text('dialog[open] h2')).toBe('Add an admin');
      expect(text('dialog[open] .set-note')).toContain('No password is set here');
      expect(el().querySelector('dialog[open] input[type="password"]')).toBeNull();

      await click('dialog[open] button[type="submit"]');
      expect(text('#usr-name-err')).toBe('Enter a name (up to 120 characters).');
      expect(text('#usr-email-err')).toBe('Enter a valid email address.');
      expect(http.match((r) => r.method === 'POST').length).toBe(0);

      await type('#usr-name', 'Nour');
      await type('#usr-email', 'nour@example.com');
      await choose('#usr-role', 'content_manager');
      expect(text('#usr-role-help')).toBe('Sections this role can use: contact messages, reviews');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      const post = await answer(is('POST', USERS), (r) =>
        r.flush({ data: account(9, { name: 'Nour', email: 'nour@example.com', role: 'content_manager' }), meta: { invitation: 'not_delivered' } }, { status: 201, statusText: 'Created' }),
      );
      expect(post.request.body).toEqual({ name: 'Nour', email: 'nour@example.com', role: 'content_manager', locale: 'en' });
      await answer(is('GET', USERS), (r) => r.flush(page([me])));
      expect(text('.usr-notice')).toContain('email is not delivered in this environment');
      expect(text('.usr-notice')).toContain('No invitation has reached nour@example.com');
      expect(text('.usr-notice')).not.toContain('emailed');
    });

    it('shows the API reason for a duplicate email', async () => {
      await open(me, [me]);
      await click('.usr-head-actions button');
      await type('#usr-name', 'Copy');
      await type('#usr-email', 'lina@example.com');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      await answer(is('POST', USERS), (r) =>
        r.flush({ message: 'Invalid', errors: { email: ['The email has already been taken.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(text('#usr-email-err')).toBe('The email has already been taken.');
      expect(text('dialog[open] [role="alert"]')).toContain('The change could not be saved.');
    });

    it('changes a role only after a confirmation step, sending the time the account was last saved', async () => {
      await open(me, [me, account(2)]);
      await click('.usr-table tbody tr:nth-child(2) .usr-row-actions button');
      expect(text('dialog[open] h2')).toBe('Edit admin');
      expect((el().querySelector('#usr-email') as HTMLInputElement).readOnly).toBeTrue();
      await choose('#usr-role', 'order_manager');
      await click('dialog[open] button[type="submit"]');
      expect(text('dialog[open] h2')).toBe('Change the role of Admin 2?');
      expect(text('dialog[open] .set-note')).toBe('From Support to Order manager. This changes which sections they can use.');
      await click('dialog[open] .set-dialog-actions .adm-button:not(.is-light)');
      await csrf();
      const patch = await answer(is('PATCH', `${USERS}/2`), (r) => r.flush({ data: account(2, { role: 'order_manager' }) }));
      expect(patch.request.body).toEqual({ expected_updated_at: '2026-11-01T08:00:00+00:00', role: 'order_manager' });
      await answer(is('GET', USERS), (r) => r.flush(page([me, account(2, { role: 'order_manager' })])));
      expect(text('.usr-notice')).toBe('The account of Admin 2 was saved.');
    });

    it('locks your own role, and shows a change made meanwhile', async () => {
      await open(me, [me, account(2)]);
      await click('.usr-table tbody tr:nth-child(1) .usr-row-actions button');
      expect((el().querySelector('#usr-role') as HTMLSelectElement).disabled).toBeTrue();
      expect(text('#usr-role-help')).toBe('You cannot change your own role.');
      await click('dialog[open] .set-dialog-actions .is-light');

      await click('.usr-table tbody tr:nth-child(2) .usr-row-actions button');
      await type('#usr-name', 'Renamed');
      await click('dialog[open] button[type="submit"]');
      await csrf();
      await answer(is('PATCH', `${USERS}/2`), (r) =>
        r.flush({ message: 'changed', current: account(2, { name: 'Changed elsewhere', updated_at: '2026-11-08T08:00:00+00:00' }) }, { status: 409, statusText: 'Conflict' }),
      );
      expect(text('dialog[open] [role="alert"]')).toContain('changed by someone else');
      expect((el().querySelector('#usr-name') as HTMLInputElement).value).toBe('Changed elsewhere');
      await click('dialog[open] .set-dialog-actions .is-light');
    });

    it('deactivates and reactivates only after confirmation; a cancelled dialog sends nothing', async () => {
      await open(me, [me, account(2)]);
      await click('.usr-table tbody tr:nth-child(2) [data-action="deactivate"]');
      expect(text('dialog[open] h2')).toBe('Deactivate Admin 2?');
      await click('dialog[open] .adm-dialog-actions .is-light');
      expect(http.match((r) => r.method === 'PATCH').length).toBe(0);

      await click('.usr-table tbody tr:nth-child(2) [data-action="deactivate"]');
      await click('dialog[open] .adm-dialog-actions .adm-button:not(.is-light)');
      await csrf();
      const off = await answer(is('PATCH', `${USERS}/2`), (r) => r.flush({ data: account(2, { is_active: false }) }));
      expect(off.request.body).toEqual({ is_active: false, expected_updated_at: '2026-11-01T08:00:00+00:00' });
      await answer(is('GET', USERS), (r) => r.flush(page([me, account(2, { is_active: false })])));
      expect(text('.usr-notice')).toBe('Admin 2 was deactivated and signed out.');

      await click('.usr-table tbody tr:nth-child(2) [data-action="activate"]');
      await click('dialog[open] .adm-dialog-actions .adm-button:not(.is-light)');
      const on = await answer(is('PATCH', `${USERS}/2`), (r) =>
        r.flush({ message: 'Invalid', errors: { is_active: ['At least one active super admin must remain.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(on.request.body.is_active).toBeTrue();
      expect(text('.usr-notice')).toBe('The change could not be saved. At least one active super admin must remain.');
    });

    it('is shown in Arabic, right to left', async () => {
      language.setLanguage('ar');
      await open(me, [me, account(2, { role: 'order_manager' })]);
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('main h1')).toBe('مستخدمو الإدارة');
      expect(el().querySelectorAll('.usr-table tbody tr')[1].textContent).toContain('مدير الطلبات');
      expect(el().querySelector('.usr-email bdi')?.getAttribute('dir')).toBe('ltr');
    });
  });
});
