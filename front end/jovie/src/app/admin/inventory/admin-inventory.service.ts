import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { MovementFilters, MovementPage, StockAdjustment, StockPage, StockRow, StockStatus } from './admin-inventory.models';

/** Inventory API (routes require inventory.manage; the API enforces it). */
@Injectable({ providedIn: 'root' })
export class AdminInventoryService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;

  stock(query: { search: string; status: StockStatus | ''; page: number }): Observable<StockPage> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminInventoryService.PER_PAGE);
    if (query.search.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<StockPage>(`${this.base}/inventory`, { params }).pipe(timeout(AdminInventoryService.TIMEOUT_MS));
  }

  movements(filters: MovementFilters): Observable<MovementPage> {
    let params = new HttpParams().set('page', filters.page).set('per_page', AdminInventoryService.PER_PAGE);
    for (const key of ['variant_id', 'reason', 'admin_id', 'order', 'from', 'to'] as const) {
      const value = filters[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<MovementPage>(`${this.base}/inventory/movements`, { params }).pipe(timeout(AdminInventoryService.TIMEOUT_MS));
  }

  /** Records an adjustment through the API's inventory service; returns the new stock. */
  adjust(variantId: number, adjustment: StockAdjustment): Observable<number> {
    return this.csrf
      .send(() =>
        this.http
          .post<{ data: { variant: { stock_quantity: number } } }>(`${this.base}/product-variants/${variantId}/stock-adjustments`, adjustment)
          .pipe(timeout(AdminInventoryService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data.variant.stock_quantity));
  }

  setThreshold(variantId: number, threshold: number | null): Observable<StockRow> {
    return this.csrf
      .send(() =>
        this.http
          .put<{ data: StockRow }>(`${this.base}/product-variants/${variantId}/low-stock-threshold`, { low_stock_threshold: threshold })
          .pipe(timeout(AdminInventoryService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }
}
