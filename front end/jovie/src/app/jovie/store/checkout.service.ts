import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, map, shareReplay, switchMap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { SiteContentService } from '../../core/content/site-content.service';
import { Language } from '../../core/i18n/language.service';
import { Money } from '../data/jovie-product.models';
import { StoredCartLine } from './cart.service';
import { Governorate, GuestCheckoutForm, Order, PaymentMethod } from './store.models';

const TOKENS_KEY = 'jovie.orders';

/** The store switches the server publishes (GET /api/v1/settings). Missing = off. */
export interface StoreConfig {
  enabled: boolean;
  codEnabled: boolean;
  codFee: Money | null;
  cardEnabled: boolean;
  freeShippingFrom: Money | null;
  /** TEST MODE (development): test prices, test fees and simulated card payments. */
  testMode: boolean;
}

const money = (piastres: unknown): Money | null =>
  typeof piastres === 'number' ? { amount_piastres: piastres, currency: 'EGP' } : null;

/** 409 from checkout: the server's totals differ from the ones the customer saw. */
export class TotalsChangedError extends Error {
  constructor(readonly totals: { subtotal: Money; shipping_fee: Money; cod_fee: Money; total: Money }) {
    super('totals-changed');
  }
}

/**
 * Checkout (guests and signed-in customers), orders and card payments of the Jovie store, on the existing Laravel API.
 * The client sends what to buy, where to deliver and how to pay; every amount is computed by the
 * server. Guest order tokens are kept for this browser tab only (sessionStorage); the confirmation
 * email carries them too.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly content = inject(SiteContentService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  static readonly TIMEOUT_MS = 15000;

  readonly config = computed<StoreConfig>(() => ({
    enabled: this.content.setting<unknown>('store.enabled', false) === true,
    codEnabled: this.content.setting<unknown>('store.cod_enabled', false) === true,
    codFee: money(this.content.setting<unknown>('store.cod_fee_piastres', null)),
    cardEnabled: this.content.setting<unknown>('store.card_payments_enabled', false) === true,
    freeShippingFrom: money(this.content.setting<unknown>('store.free_shipping_threshold_piastres', null)),
    testMode: this.content.setting<unknown>('store.test_mode', false) === true,
  }));

  private governorateList$: Observable<Governorate[]> | null = null;

  governorates(): Observable<Governorate[]> {
    this.governorateList$ ??= this.http.get<{ data: Governorate[] }>(`${this.baseUrl}/api/v1/governorates`).pipe(
      timeout(CheckoutService.TIMEOUT_MS),
      map((response) => response.data),
      catchError((error) => {
        this.governorateList$ = null;
        return throwError(() => error);
      }),
      shareReplay(1),
    );
    return this.governorateList$;
  }

  /** POST /api/v1/checkout (guest). Resolves with the order; the guest token is remembered for the tab. */
  placeGuestOrder(
    form: GuestCheckoutForm,
    items: StoredCartLine[],
    idempotencyKey: string,
    expectedTotal: number | null,
    locale: Language,
  ): Observable<Order> {
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());
    const address = form.address;
    const body = {
      payment_method: form.payment_method,
      idempotency_key: idempotencyKey,
      expected_total_piastres: expectedTotal,
      customer_note: optional(form.customer_note),
      locale,
      items,
      contact: {
        first_name: form.contact.first_name.trim(),
        last_name: form.contact.last_name.trim(),
        email: form.contact.email.trim(),
        phone: form.contact.phone.trim(),
      },
      address: {
        recipient_name: address.recipient_name.trim(),
        phone: address.phone.trim(),
        governorate_id: address.governorate_id,
        city: address.city.trim(),
        area: optional(address.area),
        street: address.street.trim(),
        building: optional(address.building),
        floor: optional(address.floor),
        apartment: optional(address.apartment),
        landmark: optional(address.landmark),
        postal_code: optional(address.postal_code),
      },
    };

    return this.post<{ data: Order; meta?: { guest_access_token?: string } }>('/api/v1/checkout', body).pipe(
      map((response) => {
        if (response.meta?.guest_access_token) {
          this.rememberToken(response.data.order_number, response.meta.guest_access_token);
        }
        return response.data;
      }),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 409 && error.error?.totals
          ? throwError(() => new TotalsChangedError(error.error.totals))
          : throwError(() => error),
      ),
    );
  }

  /**
   * POST /api/v1/checkout as a signed-in customer: the server takes the items from the account cart
   * and the contact details from the account; only the saved address and the payment are sent.
   */
  placeCustomerOrder(
    addressId: number,
    paymentMethod: PaymentMethod,
    customerNote: string,
    idempotencyKey: string,
    expectedTotal: number | null,
    locale: Language,
  ): Observable<Order> {
    const body = {
      address_id: addressId,
      payment_method: paymentMethod,
      idempotency_key: idempotencyKey,
      expected_total_piastres: expectedTotal,
      customer_note: customerNote.trim() === '' ? null : customerNote.trim(),
      locale,
    };
    return this.post<{ data: Order }>('/api/v1/checkout', body).pipe(
      map((response) => response.data),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 409 && error.error?.totals
          ? throwError(() => new TotalsChangedError(error.error.totals))
          : throwError(() => error),
      ),
    );
  }

  /** Starts a card payment; resolves with the provider's (or, in TEST MODE, the mock) payment page. */
  startCardPayment(orderNumber: string): Observable<{ redirect_url: string; merchant_reference: string }> {
    return this.post<{ data: { redirect_url: string; merchant_reference: string } }>(
      `/api/v1/orders/${encodeURIComponent(orderNumber)}/pay`,
      { token: this.token(orderNumber) },
    ).pipe(map((response) => response.data));
  }

  /** Asks the server to check the latest payment attempt with the provider, then returns the order. */
  paymentStatus(orderNumber: string): Observable<Order> {
    return this.post<{ data: Order }>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/payment-status`, {
      token: this.token(orderNumber),
    }).pipe(map((response) => response.data));
  }

  /** TEST MODE only: applies a simulated success or failure to the pending mock attempt. */
  simulatePayment(orderNumber: string, merchantReference: string, outcome: 'succeeded' | 'failed'): Observable<Order> {
    return this.post<{ data: Order }>(`/api/v1/orders/${encodeURIComponent(orderNumber)}/mock-payment`, {
      token: this.token(orderNumber),
      merchant_reference: merchantReference,
      outcome,
    }).pipe(map((response) => response.data));
  }

  /** A guest order with its token, or (signed in, no token) the customer's own order from the account. */
  order(orderNumber: string, signedIn = false): Observable<Order> {
    const number = encodeURIComponent(orderNumber);
    const token = this.token(orderNumber);
    const request =
      token === null && signedIn
        ? this.http.get<{ data: Order }>(`${this.baseUrl}/api/v1/customer/orders/${number}`)
        : this.http.get<{ data: Order }>(`${this.baseUrl}/api/v1/orders/${number}`, { params: { token: token ?? '' } });
    return request.pipe(timeout(CheckoutService.TIMEOUT_MS), map((response) => response.data));
  }

  hasToken(orderNumber: string): boolean {
    return this.token(orderNumber) !== null;
  }

  /**
   * Whether this browser can open the order: with its guest token, or through the signed-in
   * customer's session (the server only answers for the customer's own orders).
   */
  canOpen(orderNumber: string, signedIn: boolean): boolean {
    return signedIn || this.hasToken(orderNumber);
  }

  /** Which payment methods can be offered for a governorate, from the published switches. */
  methodsFor(governorate: Governorate | null): PaymentMethod[] {
    const config = this.config();
    const methods: PaymentMethod[] = [];
    if (config.codEnabled && config.codFee !== null && (governorate?.cod_available ?? true)) {
      methods.push('cod');
    }
    if (config.cardEnabled) {
      methods.push('card');
    }
    return methods;
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    const send = () => this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(timeout(CheckoutService.TIMEOUT_MS));
    return this.csrf.ensure().pipe(
      switchMap(send),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 419
          ? this.csrf.refresh().pipe(switchMap(send))
          : throwError(() => error),
      ),
    );
  }

  private token(orderNumber: string): string | null {
    return this.tokens()[orderNumber] ?? null;
  }

  private rememberToken(orderNumber: string, token: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      sessionStorage.setItem(TOKENS_KEY, JSON.stringify({ ...this.tokens(), [orderNumber]: token }));
    } catch {
      // Storage unavailable: the order can still be opened from the confirmation email.
    }
  }

  private tokens(): Record<string, string> {
    if (!this.isBrowser) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(sessionStorage.getItem(TOKENS_KEY) ?? '{}');
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
}
