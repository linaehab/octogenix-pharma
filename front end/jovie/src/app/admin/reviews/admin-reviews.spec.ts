import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { ReviewDetails, ReviewPage, ReviewRow } from './admin-reviews.models';
import { stars } from './admin-reviews.service';

const ME = '/api/v1/admin/auth/me';
const REVIEWS = '/api/v1/admin/reviews';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const editor = admin('content_editor', ['content.manage', 'messages.view', 'reviews.manage']);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);

const product = { id: 3, slug: 'jovie-1', name: { en: 'Jovie Stage 1', ar: 'جوفي 1' } };
const row = (id: number, o: Partial<ReviewRow> = {}): ReviewRow => ({
  id, author_name: 'Mona', rating: 4, title: 'Gentle milk', preview: 'My baby loves it…', is_verified_purchase: true, status: 'pending',
  product, created_at: '2026-11-08T08:00:00+00:00', updated_at: '2026-11-08T08:00:00+00:00', ...o,
});
const page = (data: ReviewRow[], current = 1, last = 1): ReviewPage => ({
  data,
  meta: {
    current_page: current, last_page: last, total: data.length,
    totals: { all: 9, pending: 2, approved: 5, hidden: 1, rejected: 1, approved_average: 4.6 },
    products: [{ id: 3, name: { en: 'Jovie Stage 1', ar: 'جوفي 1' } }, { id: 4, name: { en: 'Jovie Stage 2', ar: 'جوفي 2' } }],
  },
});
const details = (o: Partial<ReviewDetails> = {}): ReviewDetails => ({
  id: 7, author_name: 'Mona', author_email: 'mona@example.com', rating: 4, title: 'Gentle milk',
  body: '<img src=x onerror=alert(1)> My baby loves it.', recommends: true, is_verified_purchase: true, helpful_count: 3, not_helpful_count: 1,
  status: 'pending', locale: 'ar', product, order_number: 'JV-261105-00002', moderated_by: null, moderated_at: null,
  created_at: '2026-11-08T08:00:00+00:00', updated_at: '2026-11-08T08:00:00+00:00', ...o,
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin reviews', () => {
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
  const confirmDialog = () => click('dialog[open] .adm-dialog-actions .adm-button:not(.is-light)');

  describe('list', () => {
    it('shows reviewer, product, stars, review, date and status, with totals, and the section is live', async () => {
      await open('/admin/reviews', editor);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      const first = await answer(is('GET', REVIEWS), (r) => r.flush(page([row(2), row(1, { status: 'hidden', rating: 2, is_verified_purchase: false })])));
      expect(first.request.params.get('summary')).toBe('1');

      expect(text('.rvw-summary')).toBe('2 waiting · 5 approved · 1 hidden · 1 rejected · store rating 4.6 ★');
      const rows = el().querySelectorAll('.rvw-table tbody tr');
      expect(rows.length).toBe(2);
      const firstRow = rows[0].textContent!.replace(/\s+/g, ' ');
      for (const part of ['Mona', 'Verified purchase', 'Jovie Stage 1', '★★★★☆', 'Gentle milk', 'My baby loves it…', 'Waiting for approval']) {
        expect(firstRow).withContext(part).toContain(part);
      }
      expect(rows[0].querySelector('.rvw-stars')?.getAttribute('aria-label')).toBe('4 out of 5 stars');
      expect(rows[1].textContent).toContain('Hidden');
      expect(rows[1].textContent).not.toContain('Verified purchase');
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/reviews/2');
      expect(texts('#rvw-product option')).toEqual(['All', 'Jovie Stage 1', 'Jovie Stage 2']);
      const side = el().querySelector('.adm-side a[href="/admin/reviews"]');
      expect(side?.classList).toContain('is-active');
      expect(side?.querySelector('.adm-soon')).toBeNull();
    });

    it('sends search and every filter to the API, pages, retries and clears', async () => {
      await open('/admin/reviews', editor);
      await answer(is('GET', REVIEWS), (r) => r.flush(page([row(1)], 1, 3)));
      const set = (selector: string, value: string) => ((el().querySelector(selector) as HTMLInputElement | HTMLSelectElement).value = value);
      set('#rvw-search', 'gentle');
      set('#rvw-status', 'approved');
      set('#rvw-product', '4');
      set('#rvw-rating', '5');
      set('#rvw-from', '2026-11-01');
      set('#rvw-to', '2026-11-08');
      set('#rvw-sort', 'oldest');
      (el().querySelector('form.rvw-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', REVIEWS), (r) => r.flush(page([])));
      expect(['search', 'status', 'product_id', 'rating', 'from', 'to', 'sort', 'page'].map((k) => filtered.request.params.get(k)))
        .toEqual(['gentle', 'approved', '4', '5', '2026-11-01', '2026-11-08', 'oldest', '1']);
      expect(text('app-admin-state')).toBe('No review matches these filters.');

      await click('.rvw-buttons .adm-link');
      const cleared = await answer(is('GET', REVIEWS), (r) => r.flush(page([row(1)], 1, 3)));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page', 'sort', 'summary']);

      await click('.rvw-pages button:last-child');
      const second = await answer(is('GET', REVIEWS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', REVIEWS), (r) => r.flush(page([])));
      expect(text('app-admin-state')).toBe('No reviews yet.');
    });

    it('is closed to admins without reviews.manage', async () => {
      await open('/admin/reviews', support);
      expect(router.url).toBe('/admin/forbidden');
      expect(el().querySelector('.adm-side a[href="/admin/reviews"]')).toBeNull();
    });
  });

  describe('details and moderation', () => {
    it('shows the review as plain text and approves it after confirmation', async () => {
      await open('/admin/reviews/7', editor);
      await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details() }));

      expect(text('main h1')).toBe('Gentle milk');
      const body = el().querySelector('.rvd-text') as HTMLElement;
      expect(body.textContent).toContain('<img src=x onerror=alert(1)>');
      expect(body.querySelector('img')).toBeNull();
      expect(el().querySelector('.rvd-dl a')?.getAttribute('href')).toBe('/admin/products/3');
      expect(text('.rvd-details, main')).toContain('JV-261105-00002');
      expect(texts('.rvd-actions button')).toEqual(['Approve', 'Reject']);

      await click('.rvd-actions [data-action="approve"]');
      expect(text('dialog[open] h2')).toBe('Approve this review?');
      await confirmDialog();
      await csrf();
      const patch = await answer(is('PATCH', `${REVIEWS}/7`), (r) =>
        r.flush({ data: details({ status: 'approved', moderated_by: 'Lina Admin', moderated_at: '2026-11-08T09:00:00+00:00' }) }),
      );
      expect(patch.request.body).toEqual({ status: 'approved', expected_status: 'pending' });
      expect(text('.rvd-notice')).toBe('The review is approved and now public.');
      expect(text('.adm-page-head [class*="is-approved"]')).toBe('Approved (public)');
      expect(texts('.rvd-actions button')).toEqual(['Hide from the store']);
      expect(text('main')).toContain('Lina Admin');
    });

    it('hides an approved review and restores it; a cancelled dialog sends nothing', async () => {
      await open('/admin/reviews/7', editor);
      await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details({ status: 'approved' }) }));

      await click('.rvd-actions [data-action="hide"]');
      expect(text('dialog[open] h2')).toBe('Hide this review?');
      await click('dialog[open] .adm-dialog-actions .is-light');
      expect(http.match((r) => r.method === 'PATCH').length).toBe(0);

      await click('.rvd-actions [data-action="hide"]');
      await confirmDialog();
      await csrf();
      const hide = await answer(is('PATCH', `${REVIEWS}/7`), (r) => r.flush({ data: details({ status: 'hidden' }) }));
      expect(hide.request.body).toEqual({ status: 'hidden', expected_status: 'approved' });
      expect(text('.rvd-notice')).toBe('The review is hidden from the store.');

      await click('.rvd-actions [data-action="restore"]');
      await confirmDialog();
      const restore = await answer(is('PATCH', `${REVIEWS}/7`), (r) => r.flush({ data: details({ status: 'approved' }) }));
      expect(restore.request.body).toEqual({ status: 'approved', expected_status: 'hidden' });
      expect(text('.rvd-notice')).toBe('The review is shown in the store again.');
    });

    it('shows a change made meanwhile and a refused change; rejected reviews offer no action', async () => {
      await open('/admin/reviews/7', editor);
      await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details() }));

      await click('.rvd-actions [data-action="reject"]');
      expect(text('dialog[open] h2')).toBe('Reject this review?');
      await confirmDialog();
      await csrf();
      await answer(is('PATCH', `${REVIEWS}/7`), (r) =>
        r.flush({ message: 'changed', current: details({ status: 'rejected' }) }, { status: 409, statusText: 'Conflict' }),
      );
      expect(text('.rvd-notice')).toContain('changed by someone else');
      expect(el().querySelector('.rvd-actions')).toBeNull();
      expect(text('main')).toContain('Rejected reviews stay rejected.');
    });

    it('reports a refused change with the API reason', async () => {
      await open('/admin/reviews/7', editor);
      await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details({ status: 'approved' }) }));
      await click('.rvd-actions [data-action="hide"]');
      await confirmDialog();
      await csrf();
      await answer(is('PATCH', `${REVIEWS}/7`), (r) =>
        r.flush({ message: 'Invalid', errors: { status: ['This status change is not allowed.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(text('.rvd-notice')).toBe('The change could not be saved. This status change is not allowed.');
    });

    it('shows not found, and works in Arabic right to left', async () => {
      await open('/admin/reviews/99', editor);
      await answer(is('GET', `${REVIEWS}/99`), (r) => r.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' }));
      expect(text('app-admin-state')).toBe('This review was not found.');

      language.setLanguage('ar');
      await harness.navigateByUrl('/admin/reviews/7');
      await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details() }));
      expect(document.documentElement.dir).toBe('rtl');
      expect(texts('.rvd-actions button')).toEqual(['اعتماد', 'رفض']);
      expect(text('.adm-page-head [class*="is-pending"]')).toBe('بانتظار الاعتماد');
      expect(el().querySelector('.rvd-dl bdi[dir="ltr"]')?.textContent).toBe('mona@example.com');
    });
  });

  it('opens the review from its notification and marks the notification read', async () => {
    await open('/admin/notifications', editor);
    await answer(is('GET', '/api/v1/admin/notifications'), (r) =>
      r.flush({
        data: [{ id: 11, category: 'reviews', type: 'reviews.pending', data: { review_id: 7, name_en: 'Jovie Stage 1', name_ar: 'جوفي 1', rating: 4 },
          link: '/admin/reviews/7', read_at: null, created_at: '2026-11-08T08:00:00+00:00' }],
        meta: { current_page: 1, last_page: 1, total: 1, unread_count: 1 },
      }),
    );
    await click('.ntf-actions .adm-button');
    await csrf();
    await answer(is('POST', '/api/v1/admin/notifications/11/read'), (r) =>
      r.flush({ data: { id: 11, category: 'reviews', type: 'reviews.pending', data: {}, link: '/admin/reviews/7', read_at: '2026-11-08T09:00:00+00:00', created_at: '2026-11-08T08:00:00+00:00' }, meta: { unread_count: 0 } }),
    );
    await answer(is('GET', `${REVIEWS}/7`), (r) => r.flush({ data: details() }));
    expect(router.url).toBe('/admin/reviews/7');
    expect(text('main h1')).toBe('Gentle milk');
  });

  it('draws whole stars from 1 to 5', () => {
    expect(stars(5)).toBe('★★★★★');
    expect(stars(1)).toBe('★☆☆☆☆');
    expect(stars(9)).toBe('★★★★★');
  });
});
