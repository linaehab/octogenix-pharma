import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, map, of, switchMap, tap, throwError, timeout } from 'rxjs';
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

/**
 * The guest cart of the Jovie store (decision: guest checkout first).
 *
 * The browser keeps only variant IDs and quantities (localStorage, so the cart survives refreshes
 * and new tabs); every price, total, stock limit and availability comes from the server
 * (POST /api/v1/cart/preview), and checkout recalculates everything again. Signed-in carts
 * (/api/v1/customer/cart) can be added behind the same methods later.
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

  readonly lines = this.stored.asReadonly();
  readonly summary = this.priced.asReadonly();
  readonly status = this.state.asReadonly();
  /** Number of tins in the cart, shown in the header as soon as something is added. */
  readonly count = computed(() => this.stored().reduce((total, line) => total + line.quantity, 0));
  readonly isEmpty = computed(() => this.stored().length === 0);

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

  quantityOf(variantId: number): number {
    return this.stored().find((line) => line.variant_id === variantId)?.quantity ?? 0;
  }

  /** Adds tins of a variant, then prices the cart; quantities above the server's limit are lowered. */
  add(variantId: number, quantity = 1): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    const current = this.quantityOf(variantId);
    if (current === 0 && this.stored().length >= MAX_LINES) {
      return throwError(() => new Error('cart-full'));
    }
    this.write(this.upsert(variantId, Math.min(MAX_QUANTITY, current + quantity)));
    return this.refresh();
  }

  setQuantity(variantId: number, quantity: number): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    const next = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(quantity)));
    this.write(next === 0 ? this.without(variantId) : this.upsert(variantId, next));
    return this.refresh();
  }

  remove(variantId: number): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
    this.write(this.without(variantId));
    return this.refresh();
  }

  /** After an order is placed: the order holds the items now. */
  clear(): void {
    this.write([]);
    this.priced.set(emptySummary());
  }

  /**
   * Prices the stored lines. Lines the server no longer knows are dropped, and quantities above
   * what can be bought are lowered to the limit (reported in `adjustments`).
   */
  refresh(): Observable<{ summary: CartSummary; adjustments: CartAdjustment[] }> {
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
