import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { Order } from '../store/store.models';
import { AddressInput, CustomerAddress } from './account.models';
import { CustomerAuthService } from './customer-auth.service';

export interface OrderPage {
  orders: Order[];
  page: number;
  lastPage: number;
}

/**
 * The signed-in customer's orders and addresses (/api/v1/customer/...). The server only ever
 * returns the customer's own records; a 401 means the session ended and signs the page out.
 */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly auth = inject(CustomerAuthService);

  static readonly TIMEOUT_MS = 15000;

  orders(page = 1): Observable<OrderPage> {
    return this.get<{ data: Order[]; meta: { current_page: number; last_page: number } }>('/orders', { page }).pipe(
      map((response) => ({ orders: response.data, page: response.meta.current_page, lastPage: response.meta.last_page })),
    );
  }

  order(orderNumber: string): Observable<Order> {
    return this.get<{ data: Order }>(`/orders/${encodeURIComponent(orderNumber)}`).pipe(map((r) => r.data));
  }

  cancelOrder(orderNumber: string): Observable<Order> {
    return this.send<{ data: Order }>('POST', `/orders/${encodeURIComponent(orderNumber)}/cancel`, {}).pipe(map((r) => r.data));
  }

  addresses(): Observable<CustomerAddress[]> {
    return this.get<{ data: CustomerAddress[] }>('/addresses').pipe(map((r) => r.data));
  }

  addAddress(input: AddressInput): Observable<CustomerAddress> {
    return this.send<{ data: CustomerAddress }>('POST', '/addresses', input).pipe(map((r) => r.data));
  }

  updateAddress(id: number, input: Partial<AddressInput>): Observable<CustomerAddress> {
    return this.send<{ data: CustomerAddress }>('PATCH', `/addresses/${id}`, input).pipe(map((r) => r.data));
  }

  deleteAddress(id: number): Observable<void> {
    return this.send<unknown>('DELETE', `/addresses/${id}`).pipe(map(() => undefined));
  }

  private get<T>(path: string, params: Record<string, string | number> = {}): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/api/v1/customer${path}`, { params })
      .pipe(timeout(AccountApiService.TIMEOUT_MS), catchError((error: unknown) => this.failed(error)));
  }

  private send<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Observable<T> {
    return this.csrf
      .send(() =>
        this.http
          .request<T>(method, `${this.baseUrl}/api/v1/customer${path}`, { body })
          .pipe(timeout(AccountApiService.TIMEOUT_MS)),
      )
      .pipe(catchError((error: unknown) => this.failed(error)));
  }

  private failed(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
    }
    return throwError(() => error);
  }
}
