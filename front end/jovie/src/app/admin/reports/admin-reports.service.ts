import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { InventoryReport, OrdersReport, OrdersReportFilters, ProductReportRow, ReportPeriod, SalesReport, presetPeriod } from './admin-reports.models';

export type ReportName = 'sales' | 'orders' | 'products' | 'inventory';

/**
 * Reports API (read-only; routes require orders.view + payments.manage, inventory also
 * inventory.manage). Holds the selected period, shared by the report tabs.
 */
@Injectable({ providedIn: 'root' })
export class AdminReportsService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly api = inject(API_BASE_URL) ?? '';
  private readonly base = `${this.api}/api/v1/admin/reports`;

  static readonly TIMEOUT_MS = 30000;
  static readonly EXPORT_TIMEOUT_MS = 120000;
  static readonly PER_PAGE = 25;

  /** The period every report tab shows (last 30 days by default). */
  readonly period = signal<ReportPeriod>(presetPeriod('last_30_days'));

  sales(period: ReportPeriod): Observable<SalesReport> {
    return this.get<{ data: SalesReport }>('sales', this.params(period)).pipe(map((r) => r.data));
  }

  orders(period: ReportPeriod, filters: OrdersReportFilters, page: number): Observable<OrdersReport> {
    return this.get<OrdersReport>('orders', this.filterParams(this.params(period), filters).set('page', page).set('per_page', AdminReportsService.PER_PAGE));
  }

  products(period: ReportPeriod): Observable<ProductReportRow[]> {
    return this.get<{ data: ProductReportRow[] }>('products', this.params(period)).pipe(map((r) => r.data));
  }

  inventory(period: ReportPeriod): Observable<InventoryReport> {
    return this.get<{ data: InventoryReport }>('inventory', this.params(period)).pipe(map((r) => r.data));
  }

  /** Governorate names for the orders filter (the public list; reports use each order's saved name). */
  governorates(): Observable<{ id: number; name: { en: string; ar: string } }[]> {
    return this.http
      .get<{ data: { id: number; name: { en: string; ar: string } }[] }>(`${this.api}/api/v1/governorates`)
      .pipe(timeout(AdminReportsService.TIMEOUT_MS), map((r) => r.data));
  }

  /**
   * Downloads the CSV or Excel (.xlsx) file the API builds with the same filters and calculations
   * as the report, and saves it under the API's file name. Emits the file name once saved.
   */
  export(report: ReportName, period: ReportPeriod, language: string, filters?: OrdersReportFilters, format: 'csv' | 'xlsx' = 'csv'): Observable<string> {
    let params = this.params(period).set('lang', language === 'ar' ? 'ar' : 'en');
    if (filters) {
      params = this.filterParams(params, filters);
    }
    if (format === 'xlsx') {
      params = params.set('format', 'xlsx');
    }
    return this.http
      .get(`${this.base}/${report}/export`, { params, responseType: 'blob', observe: 'response' })
      .pipe(
        timeout(AdminReportsService.EXPORT_TIMEOUT_MS),
        map((response: HttpResponse<Blob>) => {
          const name = /filename="?([^";]+)"?/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? `jovie-${report}-report.${format}`;
          this.save(response.body ?? new Blob([]), name);
          return name;
        }),
      );
  }

  private save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.rel = 'noopener';
    link.style.display = 'none';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private get<T>(report: string, params: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.base}/${report}`, { params }).pipe(timeout(AdminReportsService.TIMEOUT_MS));
  }

  private params(period: ReportPeriod): HttpParams {
    return new HttpParams().set('from', period.from).set('to', period.to);
  }

  private filterParams(params: HttpParams, filters: OrdersReportFilters): HttpParams {
    for (const key of ['status', 'payment_status', 'payment_method', 'governorate_id'] as const) {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    }
    return params;
  }
}
