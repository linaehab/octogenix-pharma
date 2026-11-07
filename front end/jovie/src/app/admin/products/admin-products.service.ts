import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { AdminPage, AdminProduct, AdminProductImage, ProductListQuery, ProductPayload } from './admin-products.models';

/** Images accepted by POST /admin/uploads/images (the API checks the same). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Admin product API (routes require catalog.manage; the API enforces it). */
@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;

  list(query: ProductListQuery): Observable<AdminPage<AdminProduct>> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminProductsService.PER_PAGE);
    if (query.search.trim()) {
      params = params.set('search', query.search.trim());
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    if (query.featured) {
      params = params.set('is_featured', query.featured);
    }
    return this.http.get<AdminPage<AdminProduct>>(`${this.base}/products`, { params }).pipe(timeout(AdminProductsService.TIMEOUT_MS));
  }

  get(id: number): Observable<AdminProduct> {
    return this.http.get<{ data: AdminProduct }>(`${this.base}/products/${id}`).pipe(timeout(AdminProductsService.TIMEOUT_MS), map((r) => r.data));
  }

  create(payload: ProductPayload): Observable<AdminProduct> {
    return this.send(() => this.http.post<{ data: AdminProduct }>(`${this.base}/products`, payload)).pipe(map((r) => r.data));
  }

  update(id: number, payload: ProductPayload): Observable<AdminProduct> {
    return this.send(() => this.http.patch<{ data: AdminProduct }>(`${this.base}/products/${id}`, payload)).pipe(map((r) => r.data));
  }

  /** Archive (soft delete): hidden and kept for order history. */
  archive(id: number): Observable<void> {
    return this.send(() => this.http.delete<void>(`${this.base}/products/${id}`));
  }

  restore(id: number): Observable<AdminProduct> {
    return this.send(() => this.http.post<{ data: AdminProduct }>(`${this.base}/products/${id}/restore`, {})).pipe(map((r) => r.data));
  }

  /** Stores the file on the server and returns its path (nothing is attached yet). */
  uploadImage(file: File): Observable<string> {
    const body = new FormData();
    body.append('image', file);
    return this.send(() => this.http.post<{ data: { path: string } }>(`${this.base}/uploads/images`, body)).pipe(map((r) => r.data.path));
  }

  attachImage(productId: number, path: string): Observable<AdminProductImage> {
    return this.send(() => this.http.post<{ data: AdminProductImage }>(`${this.base}/products/${productId}/images`, { path })).pipe(map((r) => r.data));
  }

  makePrimary(imageId: number): Observable<AdminProductImage> {
    return this.send(() => this.http.patch<{ data: AdminProductImage }>(`${this.base}/product-images/${imageId}`, { is_primary: true })).pipe(
      map((r) => r.data),
    );
  }

  /** Removes the image from the product (the uploaded file itself is kept). */
  removeImage(imageId: number): Observable<void> {
    return this.send(() => this.http.delete<void>(`${this.base}/product-images/${imageId}`));
  }

  reorderImages(productId: number, ids: number[]): Observable<void> {
    return this.send(() => this.http.put<void>(`${this.base}/products/${productId}/images/order`, { ids }));
  }

  private send<T>(request: () => Observable<T>): Observable<T> {
    return this.csrf.send(() => request().pipe(timeout(AdminProductsService.TIMEOUT_MS)));
  }
}
