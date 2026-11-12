import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { AdminOrder, OrderListPage, OrderListQuery, OrderStatus, PaymentStatus } from './admin-orders.models';

/** Admin order API. Every rule (allowed changes, permissions) is checked by the API. */
@Injectable({ providedIn: 'root' })
export class AdminOrdersService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly document = inject(DOCUMENT);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/orders`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;
  static readonly EXPORT_TIMEOUT_MS = 120000;

  list(query: OrderListQuery): Observable<OrderListPage> {
    let params = this.filterParams(query).set('page', query.page).set('per_page', AdminOrdersService.PER_PAGE);
    if (query.tab) {
      params = params.set('tab', query.tab);
    }
    return this.http.get<OrderListPage>(this.base, { params }).pipe(timeout(AdminOrdersService.TIMEOUT_MS));
  }

  /**
   * Downloads every order matching the list's filters (not only the page on screen) as an Excel
   * workbook built by the API, and saves it under the API's file name. Emits that name.
   */
  export(query: OrderListQuery, language: string): Observable<string> {
    const params = this.filterParams(query).set('lang', language === 'ar' ? 'ar' : 'en');
    return this.http.get(`${this.base}/export`, { params, responseType: 'blob', observe: 'response' }).pipe(
      timeout(AdminOrdersService.EXPORT_TIMEOUT_MS),
      map((response: HttpResponse<Blob>) => {
        const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'jovie-orders.xlsx';
        const url = URL.createObjectURL(response.body ?? new Blob([]));
        const link = this.document.createElement('a');
        link.href = url;
        link.download = name;
        link.rel = 'noopener';
        link.style.display = 'none';
        this.document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return name;
      }),
    );
  }

  private filterParams(query: OrderListQuery): HttpParams {
    let params = new HttpParams();
    for (const key of ['search', 'status', 'payment_status', 'payment_method', 'governorate_id', 'from', 'to'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return params;
  }

  get(number: string): Observable<AdminOrder> {
    return this.http
      .get<{ data: AdminOrder }>(`${this.base}/${encodeURIComponent(number)}`)
      .pipe(timeout(AdminOrdersService.TIMEOUT_MS), map((r) => r.data));
  }

  /** Sends the status the admin saw: the API refuses (409) if the order changed meanwhile. */
  setStatus(number: string, status: OrderStatus, note: string | null, expected: OrderStatus): Observable<AdminOrder> {
    return this.post(`/${encodeURIComponent(number)}/status`, { status, note, expected_status: expected });
  }

  collectCod(number: string, note: string | null, expected: PaymentStatus): Observable<AdminOrder> {
    return this.post(`/${encodeURIComponent(number)}/cod-collected`, { note, expected_payment_status: expected });
  }

  restockReturned(number: string, note: string): Observable<unknown> {
    return this.csrf.send(() =>
      this.http.post(`${this.base}/${encodeURIComponent(number)}/restock-returned`, { note }).pipe(timeout(AdminOrdersService.TIMEOUT_MS)),
    );
  }

  saveNote(number: string, note: string | null): Observable<AdminOrder> {
    return this.csrf
      .send(() =>
        this.http.patch<{ data: AdminOrder }>(`${this.base}/${encodeURIComponent(number)}/note`, { admin_note: note }).pipe(timeout(AdminOrdersService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }

  private post(path: string, body: unknown): Observable<AdminOrder> {
    return this.csrf
      .send(() => this.http.post<{ data: AdminOrder }>(`${this.base}${path}`, body).pipe(timeout(AdminOrdersService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }
}
