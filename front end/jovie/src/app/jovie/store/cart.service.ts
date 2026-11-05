import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { CartSummary } from './store.models';

/** What the browser keeps: variant IDs and quantities only, never prices. */
export interface StoredCartLine {
  variant_id: number;
  quantity: number;
}

export type CartStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Why a requested quantity was lowered by the server's limits. */
export interface CartAdjustment {
  variantId: number;
  requested: number;
  allowed: number;
}

const STORAGE_KEY = 'jovie.cart';

const emptySummary = (): CartSummary => ({
  items: [],
  subtotal: { amount_piastres: 0, currency: 'EGP' },
  item_count: 0,
  has_unavailable_items: false,
});
const MAX_LINES = 50;
const MAX_QUANTITY = 999;

/** Whose cart is shown: the browser's (guest) or the signed-in customer's account cart. */
export type CartMode = 'guest' | 'customer';

/**
 * The cart of the Jovie store, behind one set of methods for guests and signed-in customers.
 *
 * Guest: the browser keeps only variant IDs and quantities (localStorage, so the cart survives
 * refreshes and new tabs); every price, total, stock limit and availability comes from the server
 * (POST /api/v1/cart/preview), and checkout recalculates everything again.
 *
 * Signed in: the cart lives in the account (/api/v1/customer/cart). On sign-in the browser cart is
 * merged into it (POST /customer/cart/merge: the server adds quantities and caps them at what can be
 * bought); the browser copy is only emptied after the server confirmed the merge, so a failed merge
 * never loses items: it is tried again on the next refresh.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  static readonly TIMEOUT_MS = 10000;

  private readonly stored = signal<StoredCartLine[]>(this.read());
  private readonly priced = signal<CartSummary | null>(null);
  private readonly state = signal<CartStatus>('idle');
  private readonly cartMode = signal<CartMode>('guest');
  /** The merge being sent: a second refresh meanwhile waits for it instead of merging the same items twice. */
  private merging: Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> | null = null;
  /** Called when the account session has ended (401); set by CustomerAuthService. */
  private sessionEnded: () => void = () => undefined;

  readonly lines = this.stored.asReadonly();
  readonly summary = this.priced.asReadonly();
  readonly status = this.state.asReadonly();
  readonly mode = this.cartMode.asReadonly();
  /** Number of tins in the cart, shown in the header as soon as something is added. */
  readonly count = computed(() => {
    const local = this.stored().reduce((total, line) => total + line.quantity, 0);
    if (this.cartMode() === 'guest') {
      return local;
    }
    // Items still waiting to be merged are counted too, so nothing seems to disappear meanwhile.
    return (this.priced()?.items ?? []).reduce((total, line) => total + line.quantity, 0) + local;
  });
  readonly isEmpty = computed(() => {
    if (this.cartMode() === 'guest') {
      return this.stored().length === 0;
    }
    const priced = this.priced();
    return this.stored().length === 0 && priced !== null && priced.items.length === 0;
  });

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    // Another tab changed the cart: follow it.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        this.stored.set(this.read());
        this.priced.set(null);
      }
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  /** Sign-in: from now on the account cart is used, with the browser cart merged into it. */
  useCustomerCart(onSessionEnded: () => void): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    this.sessionEnded = onSessionEnded;
    this.cartMode.set('customer');
    this.priced.set(null);
    return this.refresh();
  }

  /** Sign-out or an ended session: back to the browser cart (empty, or still waiting to be merged). */
  useGuestCart(): void {
    this.cartMode.set('guest');
    this.priced.set(null);
    this.state.set('idle');
  }

  quantityOf(variantId: number): number {
    if (this.cartMode() === 'customer') {
      return this.priced()?.items.find((line) => line.variant_id === variantId)?.quantity ?? 0;
    }
    return this.stored().find((line) => line.variant_id === variantId)?.quantity ?? 0;
  }

  /** Adds tins of a variant, then prices the cart; quantities above the server's limit are lowered. */
  add(variantId: number, quantity = 1): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    if (this.cartMode() === 'customer') {
      return this.addToAccount(variantId, quantity);
    }
    const current = this.quantityOf(variantId);
    if (current === 0 && this.stored().length >= MAX_LINES) {
      return throwError(() => new Error('cart-full'));
    }
    this.write(this.upsert(variantId, Math.min(MAX_QUANTITY, current + quantity)));
    return this.refresh();
  }

  setQuantity(variantId: number, quantity: number): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    const next = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
    if (this.cartMode() === 'customer') {
      return next === 0
        ? this.remove(variantId)
        : this.account('PUT', `/items/${variantId}`, { quantity: next }).pipe(map((summary) => ({ summary, adjustments: [] })));
    }
    this.write(next === 0 ? this.without(variantId) : this.upsert(variantId, next));
    return this.refresh();
  }

  remove(variantId: number): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    if (this.cartMode() === 'customer') {
      return this.account('DELETE', `/items/${variantId}`).pipe(map((summary) => ({ summary, adjustments: [] })));
    }
    this.write(this.without(variantId));
    return this.refresh();
  }

  /** After an order is placed: the order holds the items now (the server empties an account cart itself). */
  clear(): void {
    if (this.cartMode() === 'guest') {
      this.write([]);
    }
    this.priced.set(emptySummary());
  }

  /**
   * Prices the stored lines. Lines the server no longer knows are dropped, and quantities above
   * what can be bought are lowered to the limit (reported in `adjustments`).
   */
  refresh(): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    if (this.cartMode() === 'customer') {
      return this.stored().length
        ? this.merge()
        : this.account('GET', '').pipe(map((summary) => ({ summary, adjustments: [] })));
    }
    this.state.set('loading');
    return this.preview(this.stored()).pipe(
      switchMap((summary) => {
        const known = new Set(summary.items.map((line) => line.variant_id));
        const adjustments: CartAdjustment[] = summary.items
          .filter((line) => line.exceeds_available_quantity && line.max_quantity > 0)
          .map((line) => ({ variantId: line.variant_id, requested: line.quantity, allowed: line.max_quantity }));
        const corrected = this.stored()
          .filter((line) => known.has(line.variant_id))
          .map((line) => {
            const adjustment = adjustments.find((a) => a.variantId === line.variant_id);
            return adjustment ? { ...line, quantity: adjustment.allowed } : line;
          });

        if (!adjustments.length && corrected.length === this.stored().length) {
          return of({ summary, adjustments });
        }
        // Lines were dropped or lowered: keep the corrected cart and price it once more.
        this.write(corrected);
        return this.preview(corrected).pipe(map((fresh) => ({ summary: fresh, adjustments })));
      }),
      tap({
        next: ({ summary }) => {
          this.priced.set(summary);
          this.state.set('ready');
        },
        error: () => this.state.set('error'),
      }),
    );
  }

  /** Adds to an account cart line, capped at what can be bought (the server refuses more). */
  private addToAccount(variantId: number, quantity: number): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    // The current quantity must be known before adding to it.
    const loaded: Observable<unknown> = this.priced() ? of(null) : this.refresh();
    return loaded.pipe(
      switchMap(() => {
        const line = this.priced()?.items.find((l) => l.variant_id === variantId);
        const wanted = Math.min(MAX_QUANTITY, (line?.quantity ?? 0) + quantity);
        const allowed = line && line.max_quantity > 0 ? Math.min(wanted, line.max_quantity) : wanted;
        const adjustments: CartAdjustment[] = allowed < wanted ? [{ variantId, requested: wanted, allowed }] : [];
        if (line && allowed <= line.quantity) {
          return of({ summary: this.priced()!, adjustments });
        }
        return this.account('PUT', `/items/${variantId}`, { quantity: allowed }).pipe(map((summary) => ({ summary, adjustments })));
      }),
    );
  }

  /**
   * Merges the browser cart into the account cart; the browser copy is emptied only on success.
   * The server adds quantities, so one merge at a time: callers during a merge share its answer.
   */
  private merge(): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    this.merging ??= this.sendMerge().pipe(
      finalize(() => (this.merging = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.merging;
  }

  private sendMerge(): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    type Merged = {
      data: CartSummary;
      meta?: { adjusted?: { variant_id: number; requested: number; added: number }[] };
    };
    const lines = this.stored();
    this.state.set('loading');
    return this.csrf
      .send(() =>
        this.http
          .post<Merged>(`${this.baseUrl}/api/v1/customer/cart/merge`, { items: lines })
          .pipe(timeout(CartService.TIMEOUT_MS)),
      )
      .pipe(
        map((response) => {
          this.write([]);
          const adjustments = (response.meta?.adjusted ?? []).map((a) => ({
            variantId: a.variant_id,
            requested: a.requested,
            allowed: a.added,
          }));
          return { summary: response.data, adjustments };
        }),
        tap({
          next: ({ summary }) => {
            this.priced.set(summary);
            this.state.set('ready');
          },
          error: (error: unknown) => this.failedAccountRequest(error),
        }),
      );
  }

  /** A request on the account cart; every answer is the whole, freshly priced cart. */
  private account(method: 'GET' | 'PUT' | 'DELETE', path: string, body?: unknown): Observable<CartSummary> {
    const url = `${this.baseUrl}/api/v1/customer/cart${path}`;
    const request = () =>
      this.http.request<{ data: CartSummary }>(method, url, { body }).pipe(timeout(CartService.TIMEOUT_MS));
    this.state.set('loading');
    return (method === 'GET' ? request() : this.csrf.send(request)).pipe(
      map((response) => response.data),
      tap({
        next: (summary) => {
          this.priced.set(summary);
          this.state.set('ready');
        },
        error: (error: unknown) => this.failedAccountRequest(error),
      }),
    );
  }

  private failedAccountRequest(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      // The session ended (expired, or signed out in another tab): continue as a guest.
      this.useGuestCart();
      this.sessionEnded();
      return;
    }
    // A refused change (422) leaves the cart as it was: keep showing it.
    this.state.set(this.priced() ? 'ready' : 'error');
  }

  private preview(lines: StoredCartLine[]): Observable<CartSummary> {
    if (!lines.length) {
      return of(emptySummary());
    }
    const post = () =>
      this.http
        .post<{ data: CartSummary }>(`${this.baseUrl}/api/v1/cart/preview`, { items: lines })
        .pipe(timeout(CartService.TIMEOUT_MS), map((response) => response.data));

    return this.csrf.ensure().pipe(
      switchMap(post),
      // An expired XSRF token (419): fetch a new one and try once more.
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 419
          ? this.csrf.refresh().pipe(switchMap(post))
          : throwError(() => error),
      ),
    );
  }

  private upsert(variantId: number, quantity: number): StoredCartLine[] {
    return this.stored().some((line) => line.variant_id === variantId)
      ? this.stored().map((line) => (line.variant_id === variantId ? { ...line, quantity } : line))
      : [...this.stored(), { variant_id: variantId, quantity }];
  }

  private without(variantId: number): StoredCartLine[] {
    return this.stored().filter((line) => line.variant_id !== variantId);
  }

  private read(): StoredCartLine[] {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed)
        ? parsed
            .filter((line): line is StoredCartLine =>
              Number.isInteger(line?.variant_id) && line.variant_id > 0 && Number.isInteger(line?.quantity) && line.quantity > 0,
            )
            .map((line) => ({ variant_id: line.variant_id, quantity: Math.min(MAX_QUANTITY, line.quantity) }))
            .slice(0, MAX_LINES)
        : [];
    } catch {
      return [];
    }
  }

  private write(lines: StoredCartLine[]): void {
    this.stored.set(lines);
    if (this.isBrowser) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      } catch {
        // Private mode or full storage: the cart still works for this page view.
      }
    }
  }
}
