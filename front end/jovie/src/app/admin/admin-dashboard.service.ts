import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../core/api/api-base-url';

export type DashboardPeriod = 'today' | 'last_7_days' | 'last_30_days';

export interface DashboardTotals {
  amount_piastres: number;
  orders_count: number;
}

/** GET /api/v1/admin/dashboard/summary. A block is present only when the admin may see that section. */
export interface DashboardSummary {
  generated_at: string;
  timezone: string;
  currency: string;
  test_mode: boolean;
  orders?: { total: number; by_status: Record<string, number> };
  sales?: {
    /** Orders marked paid (card confirmed or COD cash recorded), by payment date; before refunds. */
    paid_revenue: Record<DashboardPeriod, DashboardTotals & { from: string; refund_review: DashboardTotals }>;
    /** Delivered orders, paid or not, by delivery date. */
    delivered_value: Record<DashboardPeriod, DashboardTotals & { from: string; not_collected: DashboardTotals }>;
    refunds_recorded: boolean;
  };
  reviews?: { pending: number };
  messages?: { new: number };
  inventory?: { low_stock: number; out_of_stock: number; without_threshold: number };
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';

  static readonly TIMEOUT_MS = 15000;

  summary(): Observable<DashboardSummary> {
    return this.http.get<{ data: DashboardSummary }>(`${this.baseUrl}/api/v1/admin/dashboard/summary`).pipe(
      timeout(AdminDashboardService.TIMEOUT_MS),
      map((response) => response.data),
    );
  }
}
