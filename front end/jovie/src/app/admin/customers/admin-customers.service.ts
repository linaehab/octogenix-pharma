import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { OrderListPage } from '../orders/admin-orders.models';
import { CustomerDetails, CustomerPage, CustomerQuery } from './admin-customers.models';

/**
 * Customer lookup (read-only; routes require customers.view). A customer's order history comes
 * from the existing orders list (orders.view), filtered by customer.
 */
@Injectable({ providedIn: 'root' })
export class AdminCustomersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;
  static readonly ORDERS_PER_PAGE = 10;

  list(query: CustomerQuery): Observable<CustomerPage> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminCustomersService.PER_PAGE);
    for (const key of ['search', 'status', 'registered_from', 'registered_to'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<CustomerPage>(`${this.base}/customers`, { params }).pipe(timeout(AdminCustomersService.TIMEOUT_MS));
  }

  get(id: number): Observable<CustomerDetails> {
    return this.http
      .get<{ data: CustomerDetails }>(`${this.base}/customers/${id}`)
      .pipe(timeout(AdminCustomersService.TIMEOUT_MS), map((r) => r.data));
  }

  orders(customerId: number, page: number): Observable<OrderListPage> {
    const params = new HttpParams().set('customer_id', customerId).set('page', page).set('per_page', AdminCustomersService.ORDERS_PER_PAGE);
    return this.http.get<OrderListPage>(`${this.base}/orders`, { params }).pipe(timeout(AdminCustomersService.TIMEOUT_MS));
  }
}
