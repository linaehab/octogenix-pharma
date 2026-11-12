import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { AdminUser } from '../admin-auth.service';
import { AdminPermission } from '../admin-permissions';
import { AdminOrder, OrderListPage, OrderListRow } from './admin-orders.models';

const ME = '/api/v1/admin/auth/me';
const ORDERS = '/api/v1/admin/orders';
const admin = (role: AdminUser['role'], permissions: AdminPermission[]): AdminUser => ({
  id: 1, name: 'Lina Admin', email: 'lina@example.com', role, is_active: true, locale: 'en', permissions, last_login_at: null, created_at: null,
});
const storeManager = admin('store_manager', ['catalog.manage', 'inventory.manage', 'orders.view', 'orders.manage', 'payments.manage', 'customers.view', 'shipping.manage', 'reviews.manage']);
const support = admin('support', ['messages.view', 'messages.manage', 'orders.view', 'customers.view']);
const egp = (p: number) => ({ amount_piastres: p, currency: 'EGP' });

const row = (n: number, o: Partial<OrderListRow> = {}): OrderListRow => ({
  id: n, order_number: `JV-261106-0000${n}`, status: 'pending_confirmation', payment_status: 'unpaid', payment_method: 'cod',
  customer: { first_name: 'Mona', last_name: 'Hassan', phone: '+201012345678' }, items_count: 3, lines_count: 1, total: egp(141000),
  governorate: { id: 1, en: 'Cairo', ar: 'القاهرة' }, refund_review: false, placed_at: '2026-11-06T08:00:00+00:00', updated_at: '2026-11-06T09:00:00+00:00', ...o,
});
const listPage = (data: OrderListRow[], current = 1, last = 1): OrderListPage => ({
  data, meta: { current_page: current, last_page: last, total: data.length }, options: { governorates: [{ id: 1, en: 'Cairo', ar: 'القاهرة' }, { id: 2, en: 'Alexandria', ar: 'الإسكندرية' }] },
});
const order = (o: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 1, order_number: 'JV-261106-00001', status: 'pending_confirmation', payment_status: 'unpaid', payment_method: 'cod',
  totals: { subtotal: egp(135000), discount: egp(0), shipping_fee: egp(5000), cod_fee: egp(1000), total: egp(141000) },
  amounts: { received: egp(0), outstanding: egp(141000) },
  contact: { first_name: 'Mona', last_name: 'Hassan', email: 'mona@example.com', phone: '+201012345678' },
  shipping_address: { recipient_name: 'Mona Hassan', phone: '+201012345678', governorate: { en: 'Cairo', ar: 'القاهرة' }, city: 'Nasr City', area: null,
    street: '12 Abbas El Akkad', building: '7', floor: null, apartment: null, landmark: 'Near the pharmacy', postal_code: null },
  customer_note: null,
  items: [{ sku: 'JOVIE-S1', product_name: { en: 'Jovie Stage 1', ar: 'جوفي 1' }, variant_name: { en: '400 g', ar: '400 جم' }, image_url: null,
    unit_price: egp(45000), quantity: 3, line_total: egp(135000) }],
  placed_at: '2026-11-06T08:00:00+00:00', updated_at: '2026-11-06T09:00:00+00:00', payment_expires_at: null, is_guest: true,
  admin_note: null, cancelled_by: null, cancellation_reason: null,
  timestamps: { confirmed_at: null, paid_at: null, shipped_at: null, delivered_at: null, cancelled_at: null, returned_at: null },
  warnings: [],
  payments: [{ id: 1, provider: 'cod', method: 'cod', status: 'pending', amount: egp(141000), merchant_reference: 'JV-261106-00001-P1', provider_transaction_id: null,
    provider_reference: null, card_brand: null, card_last4: null, failure_message: null, is_test: false, created_at: '2026-11-06T08:00:00+00:00', paid_at: null, collected_by: null }],
  history: [{ field: 'status', from: null, to: 'pending_confirmation', actor: 'guest', admin: null, note: null, customer_visible: true, at: '2026-11-06T08:00:00+00:00' }],
  stock_movements: [{ reason: 'order_reserved', quantity_change: -3, sku: 'JOVIE-S1', admin: null, at: '2026-11-06T08:00:00+00:00' }],
  actions: { statuses: ['confirmed', 'cancelled'], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: true },
  ...o,
});
const sleep = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Admin orders', () => {
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
  const ORDER = `${ORDERS}/JV-261106-00001`;

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
  /** The money list as "label amount" lines. */
  const sums = () =>
    Array.from(el().querySelectorAll('.odr-sums div'))
      .map((d) => `${d.querySelector('dt')!.textContent!.trim()} ${d.querySelector('dd')!.textContent!.trim()}`)
      .join(' | ')
      .replace(/\s+/g, ' ');
  const buttons = () => Array.from(el().querySelectorAll('.odr-buttons button')).map((b) => b.textContent!.trim());
  const buttonNamed = (name: string) => Array.from(el().querySelectorAll('.odr-buttons button')).find((b) => b.textContent!.trim() === name) as HTMLButtonElement;
  const dialogText = () => (el().querySelector('dialog[open]')?.textContent ?? '').replace(/\s+/g, ' ');
  const dialogSubmit = async (note?: string) => {
    if (note !== undefined) {
      (el().querySelector('dialog[open] textarea') as HTMLTextAreaElement).value = note;
    }
    (el().querySelector('dialog[open] form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await settle();
  };

  async function openOrder(data: AdminOrder = order(), who: AdminUser = storeManager): Promise<void> {
    await open('/admin/orders/JV-261106-00001', who);
    await answer(is('GET', ORDER), (r) => r.flush({ data }));
  }

  describe('access', () => {
    it('sends admins without orders.view to the 403 page', async () => {
      await open('/admin/orders', admin('content_editor', ['content.manage', 'messages.view', 'reviews.manage']));
      expect(router.url).toBe('/admin/forbidden');
      await harness.navigateByUrl('/admin/orders/JV-261106-00001');
      await settle();
      expect(router.url).toBe('/admin/forbidden');
    });

    it('lets support view an order without any action', async () => {
      await openOrder(order({ actions: { statuses: [], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: false } }), support);
      expect(el().querySelector('.odr-buttons')).toBeNull();
      expect(text('#odr-actions + p')).toContain('No action is available');
      expect(el().querySelector('#odr-note-box')).toBeNull();
    });
  });

  describe('list', () => {
    it('shows the orders with customer, items, total, payment, status and governorate', async () => {
      await open('/admin/orders', storeManager);
      expect(el().querySelector('app-admin-state [role="status"]')).not.toBeNull();
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1), row(2, { status: 'cancelled', payment_status: 'paid', payment_method: 'card', refund_review: true })])));
      const rows = el().querySelectorAll('.ord-table tbody tr');
      expect(rows.length).toBe(2);
      const first = rows[0].textContent!.replace(/\s+/g, ' ');
      for (const part of ['JV-261106-00001', 'Mona Hassan', '+201012345678', 'EGP 1,410', 'Cash on delivery', 'Not paid', 'New', 'Cairo']) {
        expect(first).withContext(part).toContain(part);
      }
      expect(rows[1].textContent).toContain('Refund may be due');
      expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/orders/JV-261106-00001');
      expect(text('#ord-results')).toBe('Orders: 2');
    });

    it('sends every filter to the API and clears them', async () => {
      await open('/admin/orders', storeManager);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)])));
      const set = (selector: string, value: string) => ((el().querySelector(selector) as HTMLInputElement | HTMLSelectElement).value = value);
      set('#ord-search', '0101234');
      set('#ord-status', 'delivered');
      set('#ord-payment', 'paid');
      set('#ord-method', 'cod');
      set('#ord-gov', '2');
      set('#ord-from', '2026-11-01T09:00');
      set('#ord-to', '2026-11-06T18:30');
      (el().querySelector('form.ord-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', ORDERS), (r) => r.flush(listPage([])));
      const p = filtered.request.params;
      expect([p.get('search'), p.get('status'), p.get('payment_status'), p.get('payment_method'), p.get('governorate_id'), p.get('from'), p.get('to')])
        .toEqual(['0101234', 'delivered', 'paid', 'cod', '2', '2026-11-01T09:00', '2026-11-06T18:30']);
      expect(text('app-admin-state')).toBe('No order matches these filters.');

      await click('.ord-buttons .adm-link');
      const cleared = await answer(is('GET', ORDERS), (r) => r.flush(listPage([])));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page']);
      expect(text('app-admin-state')).toBe('There are no orders yet.');
    });

    it('shows the stage and the payment as separate badges, and when the stage last changed', async () => {
      await open('/admin/orders', storeManager);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1, { status: 'shipped', payment_status: 'paid', last_status_at: '2026-11-06T10:00:00+00:00' }), row(2)])));
      const rows = el().querySelectorAll('.ord-table tbody tr');
      expect(rows[0].querySelector('.ord-status')!.textContent!.trim()).toBe('Prepared');
      expect(rows[0].querySelector('.ord-pay')!.textContent!.trim()).toBe('Paid');
      expect(rows[0].querySelector('.ord-since')!.textContent).toContain('Stage since 6 Nov 2026, 12:00');
      expect(rows[1].querySelector('.ord-since')).toBeNull();
      const statuses = Array.from(el().querySelectorAll('#ord-status option')).map((o) => o.textContent!.trim());
      expect(statuses.slice(0, 7)).toEqual(['All', 'New', 'New – awaiting card payment', 'Confirmed', 'Preparing', 'Prepared', 'Delivered']);
      expect(el().querySelector('#ord-from')!.getAttribute('type')).toBe('datetime-local');
      expect(text('#ord-time-help')).toContain('Egypt (Cairo) time');
    });

    it('pages, and retries after an error', async () => {
      await open('/admin/orders', storeManager);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)], 1, 3)));
      await click('.ord-pages button:last-child');
      const second = await answer(is('GET', ORDERS), (r) => r.flush({}, { status: 500, statusText: 'Server Error' }));
      expect(second.request.params.get('page')).toBe('2');
      expect(el().querySelector('app-admin-state [role="alert"]')).not.toBeNull();
      await click('app-admin-state button');
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)], 2, 3)));
      expect(text('.ord-pages')).toContain('Page 2 of 3');
    });

    it('exports every order matching the applied filters to Excel, one download at a time', async () => {
      const save = spyOn(HTMLAnchorElement.prototype, 'click');
      await open('/admin/orders', storeManager);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)], 1, 3)));
      (el().querySelector('#ord-status') as HTMLSelectElement).value = 'delivered';
      (el().querySelector('#ord-from') as HTMLInputElement).value = '2026-11-01T00:00';
      (el().querySelector('form.ord-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)], 1, 3)));
      expect(text('.ord-export-msg')).toBe('All orders matching the filters, not only this page.');

      await click('.ord-export button');
      expect(text('.ord-export button')).toBe('Preparing the file…');
      expect((el().querySelector('.ord-export button') as HTMLButtonElement).disabled).toBeTrue();
      const file = await answer(is('GET', `${ORDERS}/export`), (r) =>
        r.flush(new Blob(['PK']), { headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename=jovie-orders_2026-11-01_to_2026-11-08.xlsx' }) }),
      );
      const p = file.request.params;
      expect([p.get('status'), p.get('from'), p.get('lang')]).toEqual(['delivered', '2026-11-01T00:00', 'en']);
      expect(p.has('page')).withContext('the export is not limited to one page').toBeFalse();
      expect(p.has('per_page')).toBeFalse();
      expect(file.request.responseType).toBe('blob');
      expect(save).toHaveBeenCalledTimes(1);
      expect(text('.ord-export-msg')).toBe('Saved as jovie-orders_2026-11-01_to_2026-11-08.xlsx.');

      await click('.ord-export button');
      await answer(is('GET', `${ORDERS}/export`), (r) => r.flush(new Blob(['{}']), { status: 500, statusText: 'Server Error' }));
      expect(text('.ord-export-msg')).toBe('The file could not be prepared. Please try again.');
    });

    it('does not offer the export without payments.manage', async () => {
      await open('/admin/orders', support);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)])));
      expect(el().querySelector('.ord-export')).toBeNull();
    });

    it('exports in Arabic', async () => {
      language.setLanguage('ar');
      await open('/admin/orders', storeManager);
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([row(1)])));
      expect(text('.ord-export button')).toBe('تصدير Excel');
      await click('.ord-export button');
      const file = await answer(is('GET', `${ORDERS}/export`), (r) => r.flush(new Blob(['PK'])));
      expect(file.request.params.get('lang')).toBe('ar');
    });
  });

  describe('list tabs and quick actions', () => {
    const tabs = (counts: number[] = [11, 3, 3, 1, 1, 3]) => [
      { key: 'all', statuses: [], count: counts[0] },
      { key: 'new', statuses: ['pending_confirmation', 'pending_payment'], count: counts[1] },
      { key: 'in_progress', statuses: ['confirmed', 'processing'], count: counts[2] },
      { key: 'ready', statuses: ['shipped'], count: counts[3] },
      { key: 'delivered', statuses: ['delivered'], count: counts[4] },
      { key: 'closed', statuses: ['cancelled', 'returned', 'expired'], count: counts[5] },
    ] as OrderListPage['options']['tabs'];
    const withTabs = (data: OrderListRow[], counts?: number[], current = 1, last = 1): OrderListPage => {
      const page = listPage(data, current, last);
      return { ...page, options: { ...page.options, tabs: tabs(counts) } };
    };
    const newRow = row(1, { actions: { next: 'confirmed', other: ['processing', 'shipped', 'delivered', 'cancelled'] } });
    const isList = (r: TestRequest['request']) => r.method === 'GET' && r.url === ORDERS;
    const tabTexts = () =>
      Array.from(el().querySelectorAll('.ord-tab')).map((t) => Array.from(t.querySelectorAll('span')).map((x) => x.textContent!.trim()).join(' '));
    const confirmYes = () => click('dialog[open] .adm-dialog-actions button:last-child');

    it('shows the tabs with their counts and keeps the other filters when switching', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      expect(tabTexts()).toEqual(['All orders 11', 'New 3', 'In progress 3', 'Ready for delivery 1', 'Delivered 1', 'Cancelled / Returned 3']);
      expect(el().querySelector('.ord-tab.is-active')?.textContent).toContain('All orders');

      // Apply a search, a time range, a payment status and a stage, then open a tab.
      const set = (selector: string, value: string) => ((el().querySelector(selector) as HTMLInputElement).value = value);
      set('#ord-search', 'Mona');
      set('#ord-from', '2026-11-01T09:00');
      set('#ord-to', '2026-11-10T18:30');
      set('#ord-payment', 'unpaid');
      set('#ord-status', 'pending_confirmation');
      (el().querySelector('form.ord-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle();
      await answer(isList, (r) => r.flush(withTabs([newRow])));

      await click('.ord-tab[data-tab="ready"]');
      const req = await answer(isList, (r) => r.flush(withTabs([], [11, 3, 3, 0, 1, 3])));
      const p = req.request.params;
      expect([p.get('tab'), p.get('search'), p.get('from'), p.get('to'), p.get('payment_status'), p.get('status'), p.get('page')])
        .toEqual(['ready', 'Mona', '2026-11-01T09:00', '2026-11-10T18:30', 'unpaid', null, '1']);
      expect(el().querySelector('.ord-tab.is-active')?.getAttribute('aria-pressed')).toBe('true');
      expect(tabTexts()[3]).toBe('Ready for delivery 0');
      // The stage filter now offers only the tab's statuses.
      expect(Array.from(el().querySelectorAll('#ord-status option')).map((o) => o.textContent!.trim())).toEqual(['All', 'Prepared']);

      // "Cancelled / Returned" keeps them distinguishable.
      await click('.ord-tab[data-tab="closed"]');
      await answer(isList, (r) => r.flush(withTabs([row(2, { status: 'cancelled', actions: { next: null, other: [] } }), row(3, { status: 'returned', actions: { next: null, other: [] } })])));
      expect(Array.from(el().querySelectorAll('.ord-status')).map((b) => b.textContent!.trim())).toEqual(['Cancelled', 'Returned']);
      expect(Array.from(el().querySelectorAll('#ord-status option')).map((o) => o.textContent!.trim()))
        .toEqual(['All', 'Cancelled', 'Returned', 'Expired (not paid in time)']);
      expect(text('.ord-actions')).toBe('—');
      expect(text('.ord-export-msg')).toBe('The Excel file uses the filters below but not the status tab.');

      // Paging keeps the tab.
      await click('.ord-tab[data-tab="new"]');
      await answer(isList, (r) => r.flush(withTabs([newRow], undefined, 1, 2)));
      (el().querySelectorAll('.ord-pages button')[1] as HTMLButtonElement).click();
      const next = await answer(isList, (r) => r.flush(withTabs([row(4)], undefined, 2, 2)));
      expect([next.request.params.get('tab'), next.request.params.get('page')]).toEqual(['new', '2']);

      // Reset clears everything, the tab included.
      await click('.ord-buttons .adm-link');
      const reset = await answer(isList, (r) => r.flush(withTabs([newRow])));
      expect(reset.request.params.keys().sort()).toEqual(['page', 'per_page']);
    });

    it('moves an order to its next normal step from the row, then refreshes the row and the counts', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      await click('.ord-tab[data-tab="new"]');
      await answer(isList, (r) => r.flush(withTabs([newRow])));

      const button = el().querySelector('.ord-next') as HTMLButtonElement;
      expect(button.textContent!.trim()).toBe('Confirm order');
      expect(button.getAttribute('aria-label')).toBe('Confirm order: order JV-261106-00001');
      button.click();
      await settle();
      expect(dialogText()).toContain('Confirm order JV-261106-00001?');
      await confirmYes();
      await csrf();
      const post = await answer(is('POST', `${ORDER}/status`), (r) => r.flush({ data: order({ status: 'confirmed' }) }));
      expect(post.request.body).toEqual({ status: 'confirmed', note: null, expected_status: 'pending_confirmation' });
      const reload = await answer(isList, (r) => r.flush(withTabs([], [11, 2, 4, 1, 1, 3])));
      expect(reload.request.params.get('tab')).toBe('new');
      expect(text('.ord-notice')).toBe('Order JV-261106-00001 is now: Confirmed.');
      expect(tabTexts()[1]).toBe('New 2');
      expect(tabTexts()[2]).toBe('In progress 4');
    });

    it('labels every normal next step, and cancelling the confirmation sends nothing', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([
        newRow,
        row(2, { status: 'confirmed', actions: { next: 'processing', other: ['cancelled'] } }),
        row(3, { status: 'processing', actions: { next: 'shipped', other: ['cancelled'] } }),
        row(4, { status: 'shipped', actions: { next: 'delivered', other: ['cancelled', 'returned'] } }),
        row(5, { status: 'delivered', actions: { next: null, other: ['returned'] } }),
      ])));
      expect(Array.from(el().querySelectorAll('.ord-next')).map((b) => b.textContent!.trim()))
        .toEqual(['Confirm order', 'Start preparing', 'Mark as prepared', 'Mark as delivered']);
      expect(el().querySelectorAll('tbody tr')[4].querySelector('.ord-next')).toBeNull();

      (el().querySelectorAll('.ord-next')[3] as HTMLButtonElement).click();
      await settle();
      expect(dialogText()).toContain('Mark order JV-261106-00004 as delivered?');
      await click('dialog[open] .adm-dialog-actions button:first-child');
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);
    });

    it('keeps exceptional actions in a menu, with a required note sent to the API', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      expect(el().querySelector('.ord-menu-list')).toBeNull();
      await click('.ord-more');
      expect(el().querySelector('.ord-more')!.getAttribute('aria-expanded')).toBe('true');
      expect(Array.from(el().querySelectorAll('.ord-menu-list button')).map((b) => b.textContent!.trim()))
        .toEqual(['Move to "Preparing"', 'Move to "Prepared"', 'Move to "Delivered"', 'Cancel order']);
      document.body.click();
      await settle();
      expect(el().querySelector('.ord-menu-list')).toBeNull();

      // A correction explains itself and requires a note.
      await click('.ord-more');
      await click('.ord-menu-list button[data-to="delivered"]');
      expect(dialogText()).toContain('Move order JV-261106-00001 to "Delivered"?');
      expect(dialogText()).toContain('From "New" to "Delivered" is not the normal next step.');
      await dialogSubmit('');
      expect(text('dialog[open] .adm-note-error')).toBe('Please give a reason.');
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);
      await dialogSubmit('Handed over at the pharmacy');
      await csrf();
      const post = await answer(is('POST', `${ORDER}/status`), (r) => r.flush({ data: order({ status: 'delivered' }) }));
      expect(post.request.body).toEqual({ status: 'delivered', note: 'Handed over at the pharmacy', expected_status: 'pending_confirmation' });
      await answer(isList, (r) => r.flush(withTabs([row(1, { status: 'delivered', actions: { next: null, other: ['returned'] } })])));
      expect(text('.ord-notice')).toBe('Order JV-261106-00001 is now: Delivered.');

      // Cancel from the menu: the reason is required too.
      await click('.ord-more');
      await click('.ord-menu-list button[data-to="returned"]');
      expect(dialogText()).toContain('Mark order JV-261106-00001 as returned?');
      await dialogSubmit('Refused');
      const back = await answer(is('POST', `${ORDER}/status`), (r) => r.flush({ data: order({ status: 'returned' }) }));
      expect(back.request.body).toEqual({ status: 'returned', note: 'Refused', expected_status: 'delivered' });
      await answer(isList, (r) => r.flush(withTabs([])));
    });

    it('explains a stale row and an API refusal without losing the filters', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      await click('.ord-tab[data-tab="new"]');
      await answer(isList, (r) => r.flush(withTabs([newRow])));

      await click('.ord-next');
      await confirmYes();
      await csrf();
      await answer(is('POST', `${ORDER}/status`), (r) =>
        r.flush({ message: 'changed', current: { status: 'cancelled' } }, { status: 409, statusText: 'Conflict' }),
      );
      const reload = await answer(isList, (r) => r.flush(withTabs([row(1, { status: 'cancelled', actions: { next: null, other: [] } })])));
      expect(reload.request.params.get('tab')).toBe('new');
      expect(text('.ord-notice')).toContain('Order JV-261106-00001 changed meanwhile');
      expect(el().querySelector('.ord-notice')!.getAttribute('role')).toBe('alert');

      await click('.ord-tab[data-tab="all"]');
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      await click('.ord-next');
      await confirmYes();
      await answer(is('POST', `${ORDER}/status`), (r) =>
        r.flush({ message: 'Invalid', errors: { status: ['This order cannot move to that stage.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(text('.ord-notice')).toContain('That did not work.');
      expect(text('.ord-notice')).toContain('This order cannot move to that stage.');
      expect((el().querySelector('.ord-next') as HTMLButtonElement).disabled).toBeFalse();
    });

    it('shows no actions column to admins who cannot change orders', async () => {
      await open('/admin/orders', support);
      await answer(isList, (r) => r.flush(withTabs([row(1, { actions: null })])));
      expect(el().querySelector('.ord-actions')).toBeNull();
      expect(el().querySelector('.ord-next')).toBeNull();
      expect(tabTexts().length).toBe(6);
    });

    it('works in Arabic, right to left', async () => {
      await open('/admin/orders', storeManager);
      await answer(isList, (r) => r.flush(withTabs([newRow])));
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(Array.from(el().querySelectorAll('.ord-tab span:first-child')).map((t) => t.textContent!.trim())).toEqual(['كل الطلبات', 'جديدة', 'قيد التنفيذ', 'جاهزة للتوصيل', 'تم التسليم', 'ملغاة / مرتجعة']);
      expect(text('.ord-next')).toBe('تأكيد الطلب');
      expect(text('.ord-more')).toContain('إجراءات أخرى');
      expect(text('.ord-status')).toBe('طلب جديد');
      expect(text('.ord-pay')).toBe('غير مدفوع');
    });
  });

  describe('order page', () => {
    it('shows items as ordered, money, payment, customer, address and the timeline', async () => {
      await openOrder();
      expect(text('h1')).toBe('JV-261106-00001');
      expect(text('.odr-items')).toContain('Jovie Stage 1');
      expect(text('.odr-items')).toContain('3 × EGP 450');
      expect(text('.odr-items')).toContain('EGP 1,350');
      const moneyRows = sums();
      for (const part of ['Subtotal EGP 1,350', 'Shipping EGP 50', 'Cash-on-delivery fee EGP 10', 'Total EGP 1,410', 'Received EGP 0', 'Still to be paid EGP 1,410']) {
        expect(moneyRows).withContext(part).toContain(part);
      }
      expect(moneyRows).not.toContain('Discount');
      expect(text('#odr-payment ~ .odr-help')).toContain('not paid until the cash is recorded');
      expect(text('.odr-address')).toContain('12 Abbas El Akkad');
      expect(text('.odr-address')).toContain('Near the pharmacy');
      expect(text('#odr-customer + .odr-facts')).toContain('mona@example.com');
      const events = Array.from(el().querySelectorAll('.odr-timeline li .odr-event')).map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
      expect(events).toEqual(['Order placed (New)', 'Stock reserved: 3 × JOVIE-S1 internal']);
    });

    it('shows only the actions the API allows and the refund warning', async () => {
      await openOrder(order({
        status: 'expired', payment_status: 'paid', payment_method: 'card', warnings: ['refund_may_be_due'],
        actions: { statuses: [], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: true },
      }));
      expect(el().querySelector('.odr-buttons')).toBeNull();
      expect(text('.odr-warning')).toContain('A refund may be due');
      expect(text('.odr-warning')).toContain('Refunds are not handled in the dashboard yet');

      await harness.navigateByUrl('/admin/orders');
      await answer(is('GET', ORDERS), (r) => r.flush(listPage([])));
      await harness.navigateByUrl('/admin/orders/JV-261106-00001');
      await answer(is('GET', ORDER), (r) => r.flush({ data: order() }));
      expect(buttons()).toEqual(['Confirm order', 'Cancel order']);
    });

    it('confirms with the status it saw and shows the new state', async () => {
      await openOrder();
      buttonNamed('Confirm order').click();
      await settle();
      expect(dialogText()).toContain('Confirm order JV-261106-00001?');
      await dialogSubmit('');
      await csrf();
      const post = await answer(is('POST', `${ORDER}/status`), (r) =>
        r.flush({ data: order({ status: 'confirmed', actions: { statuses: ['processing', 'cancelled'], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: true } }) }),
      );
      expect(post.request.body).toEqual({ status: 'confirmed', note: null, expected_status: 'pending_confirmation' });
      expect(text('.odr-notice')).toBe('The order is now: Confirmed.');
      expect(text('.odr-status')).toBe('Confirmed');
      expect(buttons()).toEqual(['Start preparing', 'Cancel order']);
    });

    it('needs a reason to cancel and can be cancelled without sending anything', async () => {
      await openOrder();
      buttonNamed('Cancel order').click();
      await settle();
      expect(dialogText()).toContain('The 3 reserved unit(s) go back to stock.');
      await dialogSubmit('');
      expect(text('dialog[open] .adm-note-error')).toBe('Please give a reason.');
      (el().querySelector('dialog[open] .adm-note-actions .is-light') as HTMLButtonElement).click();
      await settle();
      expect(http.match((r) => !r.url.endsWith('/notifications/unread-count')).length).toBe(0);

      buttonNamed('Cancel order').click();
      await settle();
      await dialogSubmit('Customer asked');
      await csrf();
      const post = await answer(is('POST', `${ORDER}/status`), (r) => r.flush({ data: order({ status: 'cancelled', cancellation_reason: 'Customer asked', actions: null }) }));
      expect(post.request.body).toEqual({ status: 'cancelled', note: 'Customer asked', expected_status: 'pending_confirmation' });
      expect(text('.odr-reason')).toBe('Reason: Customer asked');
    });

    it('reloads and explains when the order changed meanwhile', async () => {
      await openOrder();
      buttonNamed('Confirm order').click();
      await settle();
      await dialogSubmit('');
      await csrf();
      await answer(is('POST', `${ORDER}/status`), (r) => r.flush({ message: 'changed', current_status: 'cancelled' }, { status: 409, statusText: 'Conflict' }));
      await answer(is('GET', ORDER), (r) => r.flush({ data: order({ status: 'cancelled', actions: { statuses: [], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: true } }) }));
      expect(text('.odr-notice')).toContain('This order changed meanwhile');
      expect(text('.odr-status')).toBe('Cancelled');
      expect(el().querySelector('.odr-buttons')).toBeNull();
    });

    it('records COD cash once, with confirmation, and shows the API reason when refused', async () => {
      const delivered = order({ status: 'delivered', actions: { statuses: [], reason_required: ['cancelled'], cod_collect: true, restock_returned: false, edit_note: true } });
      await openOrder(delivered);
      buttonNamed('Record cash as collected').click();
      await settle();
      expect(dialogText()).toContain('Confirm that EGP 1,410 was received in cash.');
      await dialogSubmit('Courier handed over');
      await csrf();
      const post = await answer(is('POST', `${ORDER}/cod-collected`), (r) =>
        r.flush({ message: 'x', errors: { payment: ['The cash for this order was already recorded.'] } }, { status: 422, statusText: 'Unprocessable' }),
      );
      expect(post.request.body).toEqual({ note: 'Courier handed over', expected_payment_status: 'unpaid' });
      expect(text('.odr-notice')).toContain('The cash for this order was already recorded.');

      buttonNamed('Record cash as collected').click();
      await settle();
      await dialogSubmit('');
      await answer(is('POST', `${ORDER}/cod-collected`), (r) =>
        r.flush({ data: order({ status: 'delivered', payment_status: 'paid', amounts: { received: egp(141000), outstanding: egp(0) },
          payments: [{ ...delivered.payments[0], status: 'succeeded', paid_at: '2026-11-06T12:00:00+00:00', collected_by: { id: 1, name: 'Lina Admin' } }],
          actions: { statuses: [], reason_required: ['cancelled'], cod_collect: false, restock_returned: false, edit_note: true } }) }),
      );
      expect(text('.odr-notice')).toBe('The cash was recorded and the order is paid.');
      expect(el().querySelector('.odr-buttons')).toBeNull();
      expect(text('.odr-payment-record')).toContain('Cash recorded by Lina Admin');
      expect(sums()).toContain('Still to be paid EGP 0');
    });

    it('saves the internal note', async () => {
      await openOrder();
      (el().querySelector('#odr-note-box') as HTMLTextAreaElement).value = ' Call before delivery ';
      (el().querySelector('#odr-internal-note + form') as HTMLFormElement).dispatchEvent(new Event('submit'));
      await settle();
      await csrf();
      const patch = await answer(is('PATCH', `${ORDER}/note`), (r) => r.flush({ data: order({ admin_note: 'Call before delivery' }) }));
      expect(patch.request.body).toEqual({ admin_note: 'Call before delivery' });
      expect(text('.odr-notice')).toBe('The internal note was saved.');
    });

    it('shows not found and error states', async () => {
      await open('/admin/orders/JV-261106-00001', storeManager);
      await answer(is('GET', ORDER), (r) => r.flush({}, { status: 404, statusText: 'Not Found' }));
      expect(text('app-admin-state')).toBe('This order does not exist.');
    });

    it('keeps corrections apart from the next steps, requires a note and records it in the timeline', async () => {
      const corrections = ['pending_confirmation', 'confirmed', 'processing', 'shipped'] as const;
      const delivered = order({
        status: 'delivered',
        timestamps: { confirmed_at: '2026-11-06T09:00:00+00:00', paid_at: null, shipped_at: '2026-11-06T10:00:00+00:00', delivered_at: '2026-11-06T11:00:00+00:00', cancelled_at: null, returned_at: null },
        actions: { statuses: [...corrections, 'returned'], reason_required: ['cancelled', ...corrections, 'returned'], cod_collect: false, restock_returned: false, edit_note: true },
      });
      await openOrder(delivered);
      expect(text('.odr-status')).toBe('Delivered');
      expect(text('.odr-pay')).toBe('Not paid');
      expect(text('.odr-since')).toContain('Stage since');
      expect(buttons()).toEqual(['Mark as returned']);
      const options = Array.from(el().querySelectorAll('#odr-correct-to option')).map((o) => o.textContent!.trim());
      expect(options).toEqual(['Choose a stage', 'New', 'Confirmed', 'Preparing', 'Prepared']);
      const go = el().querySelector('.odr-correct button[type="submit"]') as HTMLButtonElement;
      expect(go.disabled).toBeTrue();

      const select = el().querySelector('#odr-correct-to') as HTMLSelectElement;
      select.value = 'processing';
      select.dispatchEvent(new Event('change'));
      await settle();
      expect(go.disabled).toBeFalse();
      go.click();
      await settle();
      expect(dialogText()).toContain('Move order JV-261106-00001 to "Preparing"?');
      expect(dialogText()).toContain('From "Delivered" to "Preparing" is not the normal next step.');
      await dialogSubmit('');
      expect(text('dialog[open] .adm-note-error')).toBe('Please give a reason.');
      await dialogSubmit('Driver brought it back');
      await csrf();
      const post = await answer(is('POST', `${ORDER}/status`), (r) =>
        r.flush({ data: order({
          status: 'processing',
          history: [
            ...delivered.history,
            { field: 'status', from: 'delivered', to: 'processing', actor: 'admin', admin: { id: 1, name: 'Lina Admin' }, note: 'Driver brought it back', customer_visible: true, at: '2026-11-06T12:00:00+00:00' },
          ],
        }) }),
      );
      expect(post.request.body).toEqual({ status: 'processing', note: 'Driver brought it back', expected_status: 'delivered' });
      expect(text('.odr-notice')).toBe('The order is now: Preparing.');
      const last = el().querySelector('.odr-timeline li:last-child')!;
      expect(last.querySelector('.odr-event')!.textContent!.trim()).toBe('Status: Delivered → Preparing');
      expect(last.querySelector('.odr-meta')!.textContent).toContain('Lina Admin');
      expect(last.querySelector('.odr-note')!.textContent!.trim()).toBe('Driver brought it back');
    });

    it('works in Arabic, right to left', async () => {
      await openOrder();
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('.odr-status')).toBe('طلب جديد');
      expect(text('.odr-pay')).toBe('غير مدفوع');
      expect(buttons()).toEqual(['تأكيد الطلب', 'إلغاء الطلب']);
      expect(text('.odr-items')).toContain('جوفي 1');
      expect(text('.odr-address')).toContain('القاهرة');
    });
  });
});
