import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import {
  Page,
  ProductDiscount,
  ProductDiscountChange,
  ProductDiscountRow,
  PromoCode,
  PromoCodeChange,
} from './admin-discounts.models';

/**
 * Product discounts and promo codes (routes require catalog.manage). The API validates every
 * value and decides every price; this service only carries the admin's choices.
 */
@Injectable({ providedIn: 'root' })
export class AdminDiscountsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;

  products(filters: { search?: string; state?: string; page?: number }): Observable<Page<ProductDiscountRow>> {
    return this.http
      .get<Page<ProductDiscountRow>>(`${this.base}/discounts/products`, { params: params(filters) })
      .pipe(timeout(AdminDiscountsService.TIMEOUT_MS));
  }

  /** Saves only if the discount is still `expected` (otherwise 409 with the current one). */
  setProductDiscount(variantId: number, change: ProductDiscountChange, expected: ProductDiscount | null): Observable<ProductDiscountRow> {
    return this.csrf
      .send(() =>
        this.http
          .put<{ data: ProductDiscountRow }>(`${this.base}/product-variants/${variantId}/discount`, { ...change, expected })
          .pipe(timeout(AdminDiscountsService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }

  removeProductDiscount(variantId: number, expected: ProductDiscount | null): Observable<ProductDiscountRow> {
    return this.csrf
      .send(() =>
        this.http
          .delete<{ data: ProductDiscountRow }>(`${this.base}/product-variants/${variantId}/discount`, { body: { expected } })
          .pipe(timeout(AdminDiscountsService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }

  promoCodes(filters: { search?: string; state?: string; page?: number }): Observable<Page<PromoCode>> {
    return this.http
      .get<Page<PromoCode>>(`${this.base}/promo-codes`, { params: params(filters) })
      .pipe(timeout(AdminDiscountsService.TIMEOUT_MS));
  }

  promoCode(id: number): Observable<PromoCode> {
    return this.http
      .get<{ data: PromoCode }>(`${this.base}/promo-codes/${id}`)
      .pipe(timeout(AdminDiscountsService.TIMEOUT_MS), map((r) => r.data));
  }

  createPromoCode(change: PromoCodeChange): Observable<PromoCode> {
    return this.csrf
      .send(() => this.http.post<{ data: PromoCode }>(`${this.base}/promo-codes`, change).pipe(timeout(AdminDiscountsService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }

  /** Saves only if the code was not changed since `expected_updated_at` (otherwise 409). */
  updatePromoCode(id: number, change: PromoCodeChange): Observable<PromoCode> {
    return this.csrf
      .send(() => this.http.patch<{ data: PromoCode }>(`${this.base}/promo-codes/${id}`, change).pipe(timeout(AdminDiscountsService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }
}

function params(filters: Record<string, string | number | undefined>): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') {
      result = result.set(key, value);
    }
  }
  return result;
}
