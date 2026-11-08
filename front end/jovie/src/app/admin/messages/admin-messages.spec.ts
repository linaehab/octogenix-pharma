import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { MessageDetails, MessagePage, MessageRow } from './admin-messages.models';

const ME = '/api/v1/admin/auth/me';
const MESSAGES = '/api/v1/admin/contact-messages';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);
const editor = admin('content_editor', ['content.manage', 'messages.view', 'reviews.manage']);
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);

const row = (id: number, o: Partial<MessageRow> = {}): MessageRow => ({
  id, site: 'corporate', first_name: 'Mona', last_name: 'Hassan', email: 'mona@example.com', subject: 'partnership',
  preview: 'We would like to discuss distribution…', status: 'new', created_at: '2026-11-08T08:00:00+00:00', ...o,
});
const page = (data: MessageRow[], current = 1, last = 1): MessagePage => ({ data, meta: { current_page: current, last_page: last, total: data.length } });
const details = (o: Partial<MessageDetails> = {}): MessageDetails => ({
  id: 5, site: 'jovie', first_name: 'Mona', last_name: 'Hassan', email: 'mona@example.com', phone: '+201012345678', subject: 'partnership',
  message: '<script>alert(1)</script>\nWe would like to talk.', locale: 'ar', status: 'read', admin_notes: null,
  read_at: '2026-11-08T09:00:00+00:00', resolved_at: null, created_at: '2026-11-08T08:00:00+00:00', ...o,
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin contact messages', () => {
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

  async function open(url: string, who: AdminUser): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await answer(is('GET', ME), (r) => r.flush({ data: who }));
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

  describe('list', () => {
    it('shows sender, subject, preview, date and status, with unread messages marked, and the section is live', async () => {
      await open('/admin/messages', support);
      expect(router.url).toBe('/admin/contact-messages');
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      await answer(is('GET', MESSAGES), (r) => r.flush(page([row(2), row(1, { status: 'replied', first_name: 'Omar', last_name: null, subject: null })])));

      const rows = el().querySelectorAll('.msg-table tbody tr');
      expect(rows.length).toBe(2);
      expect(rows[0].classList).toContain('is-unread');
      expect(rows[0].querySelector('.msg-dot')).not.toBeNull();
      const first = rows[0].textContent!.replace(/\s+/g, ' ');
      for (const part of ['Mona Hassan', 'mona@example.com', 'Partnership', 'We would like to discuss distribution…', 'New']) {
        expect(first).withContext(part).toContain(part);
      }
      expect(rows[1].classList).not.toContain('is-unread');
      expect(rows[1].textContent).toContain('No subject');
      expect(rows[1].textContent).toContain('Replied');
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/contact-messages/2');
      expect(text('#msg-results')).toBe('Messages: 2');
      const side = el().querySelector('.adm-side a[href="/admin/contact-messages"]');
      expect(side?.classList).toContain('is-active');
      expect(side?.querySelector('.adm-soon')).toBeNull();
    });

    it('sends search, status, dates and order to the API, pages, and clears', async () => {
      await open('/admin/contact-messages', support);
      const first = await answer(is('GET', MESSAGES), (r) => r.flush(page([row(1)], 1, 3)));
      expect(first.request.params.get('sort')).toBe('newest');
      const set = (selector: string, value: string) => ((el().querySelector(selector) as HTMLInputElement | HTMLSelectElement).value = value);
      set('#msg-search', 'mona');
      set('#msg-status', 'replied');
      set('#msg-from', '2026-11-01');
      set('#msg-to', '2026-11-08');
      set('#msg-sort', 'oldest');
      (el().querySelector('form.msg-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', MESSAGES), (r) => r.flush(page([])));
      const p = filtered.request.params;
      expect(['search', 'status', 'from', 'to', 'sort', 'page'].map((k) => p.get(k))).toEqual(['mona', 'replied', '2026-11-01', '2026-11-08', 'oldest', '1']);
      expect(text('app-admin-state')).toBe('No message matches these filters.');

      await click('.msg-buttons .adm-link');
      const cleared = await answer(is('GET', MESSAGES), (r) => r.flush(page([row(1)], 1, 3)));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page', 'sort']);

      await click('.msg-pages button:last-child');
      const second = await answer(is('GET', MESSAGES), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', MESSAGES), (r) => r.flush(page([], 1, 1)));
      expect(text('app-admin-state')).toBe('No contact messages yet.');
    });

    it('is closed to admins without messages.view', async () => {
      await open('/admin/contact-messages', storeManager);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/contact-messages"]')).toBeNull();
    });
  });

  describe('details', () => {
    it('shows the message as plain text and records a reply after confirmation', async () => {
      await open('/admin/contact-messages/5', support);
      await answer(is('GET', `${MESSAGES}/5`), (r) => r.flush({ data: details() }));

      expect(text('main h1')).toBe('Partnership');
      const body = el().querySelector('.msd-text') as HTMLElement;
      expect(body.textContent).toContain('<script>alert(1)</script>');
      expect(body.querySelector('script')).toBeNull();
      expect(text('.msd-dl')).toContain('+201012345678');
      expect(text('.msd-dl')).toContain('Jovie site');
      expect(text('.msd-dl')).toContain('Arabic');
      const reply = el().querySelector('.msd-actions a') as HTMLAnchorElement;
      expect(reply.getAttribute('href')).toBe('mailto:mona%40example.com?subject=Re%3A%20Partnership');
      expect(text('.msd-note')).toContain('does not send email');

      await click('.msd-actions button.adm-button:not(.is-light)');
      expect(text('dialog[open] h2')).toBe('Mark this message as replied?');
      await click('dialog[open] .adm-dialog-actions .adm-button:not(.is-light)');
      await csrf();
      const patch = await answer(is('PATCH', `${MESSAGES}/5`), (r) => r.flush({ data: details({ status: 'replied' }) }));
      expect(patch.request.body).toEqual({ status: 'replied', expected_status: 'read' });
      expect(text('.msd-notice')).toBe('The message is marked as replied.');
      expect(text('.adm-page-head [class*="is-replied"]')).toBe('Replied');

      await click('.msd-actions button');
      const undo = await answer(is('PATCH', `${MESSAGES}/5`), (r) =>
        r.flush({ message: 'changed', current: details({ status: 'resolved' }) }, { status: 409, statusText: 'Conflict' }),
      );
      expect(undo.request.body).toEqual({ status: 'read', expected_status: 'replied' });
      expect(text('.msd-notice')).toContain('changed by someone else');
      expect(text('.adm-page-head [class*="is-resolved"]')).toBe('Resolved');
    });

    it('offers no reply for a message nobody has opened yet, and nothing to view-only admins', async () => {
      await open('/admin/contact-messages/5', editor);
      await answer(is('GET', `${MESSAGES}/5`), (r) => r.flush({ data: details({ status: 'new', read_at: null }) }));
      expect(el().querySelector('.msd-actions')).toBeNull();
      expect(text('.msd-note')).toContain('You can read messages but not change them');
      expect(text('.adm-page-head [class*="is-new"]')).toBe('New');
    });

    it('shows not found and error states', async () => {
      await open('/admin/contact-messages/99', support);
      await answer(is('GET', `${MESSAGES}/99`), (r) => r.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' }));
      expect(text('app-admin-state')).toBe('This message was not found.');
    });

    it('is shown in Arabic, right to left, with the email kept left to right', async () => {
      language.setLanguage('ar');
      await open('/admin/contact-messages/5', support);
      await answer(is('GET', `${MESSAGES}/5`), (r) => r.flush({ data: details() }));
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('main h1')).toBe('شراكة');
      expect(text('.msd-actions a')).toBe('الرد بالبريد الإلكتروني');
      expect(el().querySelector('.msd-dl bdi[dir="ltr"]')?.textContent).toBe('mona@example.com');
    });
  });

  it('opens the message from its notification and marks the notification read', async () => {
    await open('/admin/notifications', support);
    await answer(is('GET', '/api/v1/admin/notifications'), (r) =>
      r.flush({
        data: [{ id: 9, category: 'messages', type: 'messages.received', data: { message_id: 5, subject: 'partnership', site: 'corporate' },
          link: '/admin/contact-messages/5', read_at: null, created_at: '2026-11-08T08:00:00+00:00' }],
        meta: { current_page: 1, last_page: 1, total: 1, unread_count: 1 },
      }),
    );
    expect(texts('.ntf-text p')[0]).toBe('New contact message: partnership.');
    await click('.ntf-actions .adm-button');
    await csrf();
    await answer(is('POST', '/api/v1/admin/notifications/9/read'), (r) =>
      r.flush({ data: { id: 9, category: 'messages', type: 'messages.received', data: {}, link: '/admin/contact-messages/5', read_at: '2026-11-08T09:00:00+00:00', created_at: '2026-11-08T08:00:00+00:00' }, meta: { unread_count: 0 } }),
    );
    await answer(is('GET', `${MESSAGES}/5`), (r) => r.flush({ data: details() }));
    expect(router.url).toBe('/admin/contact-messages/5');
    expect(text('main h1')).toBe('Partnership');
  });
});
