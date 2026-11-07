import { provideHttpClient } from '@angular/common/http';
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
      for (const part of ['JV-261106-00001', 'Mona Hassan', '+201012345678', 'EGP 1,410', 'Cash on delivery', 'Not paid', 'Awaiting confirmation', 'Cairo']) {
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
      set('#ord-from', '2026-11-01');
      set('#ord-to', '2026-11-06');
      (el().querySelector('form.ord-filters') as HTMLFormElement).dispatchEvent(new Event('submit'));
      const filtered = await answer(is('GET', ORDERS), (r) => r.flush(listPage([])));
      const p = filtered.request.params;
      expect([p.get('search'), p.get('status'), p.get('payment_status'), p.get('payment_method'), p.get('governorate_id'), p.get('from'), p.get('to')])
        .toEqual(['0101234', 'delivered', 'paid', 'cod', '2', '2026-11-01', '2026-11-06']);
      expect(text('app-admin-state')).toBe('No order matches these filters.');

      await click('.ord-buttons .adm-link');
      const cleared = await answer(is('GET', ORDERS), (r) => r.flush(listPage([])));
      expect(cleared.request.params.keys().sort()).toEqual(['page', 'per_page']);
      expect(text('app-admin-state')).toBe('There are no orders yet.');
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
      expect(events).toEqual(['Order placed (Awaiting confirmation)', 'Stock reserved: 3 × JOVIE-S1 internal']);
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
      expect(http.match(() => true).length).toBe(0);

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

    it('works in Arabic, right to left', async () => {
      await openOrder();
      language.setLanguage('ar');
      await settle();
      expect(document.documentElement.dir).toBe('rtl');
      expect(text('.odr-status')).toBe('بانتظار التأكيد');
      expect(buttons()).toEqual(['تأكيد الطلب', 'إلغاء الطلب']);
      expect(text('.odr-items')).toContain('جوفي 1');
      expect(text('.odr-address')).toContain('القاهرة');
    });
  });
});
