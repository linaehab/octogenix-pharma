import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { AdminBrand, AdminService, CompanyInfoSetting, ContentListItem, ServiceCategory, SiteContentEditor } from './admin-website.models';

/**
 * Corporate website API (routes require content.manage; the API checks every request, the
 * dashboard only hides what the admin cannot use).
 */
@Injectable({ providedIn: 'root' })
export class AdminWebsiteService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;

  // Brands
  brands(): Observable<AdminBrand[]> {
    return this.read<AdminBrand[]>('/brands');
  }

  brand(id: number): Observable<AdminBrand> {
    return this.read<AdminBrand>(`/brands/${id}`);
  }

  createBrand(body: Partial<AdminBrand>): Observable<AdminBrand> {
    return this.write<AdminBrand>('post', '/brands', body);
  }

  /** With expected_updated_at: the API refuses (409) if the brand changed since it was opened. */
  updateBrand(id: number, body: Partial<AdminBrand> & { expected_updated_at?: string | null }): Observable<AdminBrand> {
    return this.write<AdminBrand>('patch', `/brands/${id}`, body);
  }

  deleteBrand(id: number): Observable<unknown> {
    return this.csrf.send(() => this.http.delete(`${this.base}/brands/${id}`).pipe(timeout(AdminWebsiteService.TIMEOUT_MS)));
  }

  reorderBrands(ids: number[]): Observable<AdminBrand[]> {
    return this.write<AdminBrand[]>('put', '/brands/order', { ids });
  }

  // Services
  services(): Observable<AdminService[]> {
    return this.read<AdminService[]>('/services');
  }

  service(id: number): Observable<AdminService> {
    return this.read<AdminService>(`/services/${id}`);
  }

  createService(body: Partial<AdminService>): Observable<AdminService> {
    return this.write<AdminService>('post', '/services', body);
  }

  updateService(id: number, body: Partial<AdminService> & { expected_updated_at?: string | null }): Observable<AdminService> {
    return this.write<AdminService>('patch', `/services/${id}`, body);
  }

  deleteService(id: number): Observable<unknown> {
    return this.csrf.send(() => this.http.delete(`${this.base}/services/${id}`).pipe(timeout(AdminWebsiteService.TIMEOUT_MS)));
  }

  reorderServices(category: ServiceCategory, ids: number[]): Observable<AdminService[]> {
    return this.write<AdminService[]>('put', '/services/order', { category, ids });
  }

  // Company information
  companyInfo(): Observable<CompanyInfoSetting[]> {
    return this.read<CompanyInfoSetting[]>('/company-info');
  }

  saveCompanyInfo(settings: Record<string, unknown>, expected: Record<string, unknown>): Observable<CompanyInfoSetting[]> {
    return this.write<CompanyInfoSetting[]>('patch', '/company-info', { settings, expected });
  }

  // Page content (registry entries and lists)
  content(site = 'corporate'): Observable<SiteContentEditor> {
    return this.read<SiteContentEditor>(`/content/${site}`);
  }

  saveEntries(entries: Record<string, Record<string, string | null>>, site = 'corporate'): Observable<SiteContentEditor> {
    return this.write<SiteContentEditor>('patch', `/content/${site}/entries`, { entries });
  }

  createItem(listKey: string, body: Record<string, unknown>, site = 'corporate'): Observable<ContentListItem> {
    return this.write<ContentListItem>('post', `/content/${site}/lists/${encodeURIComponent(listKey)}/items`, body);
  }

  updateItem(id: number, body: Record<string, unknown>): Observable<ContentListItem> {
    return this.write<ContentListItem>('patch', `/content-items/${id}`, body);
  }

  deleteItem(id: number): Observable<unknown> {
    return this.csrf.send(() => this.http.delete(`${this.base}/content-items/${id}`).pipe(timeout(AdminWebsiteService.TIMEOUT_MS)));
  }

  reorderItems(listKey: string, ids: number[], site = 'corporate'): Observable<unknown> {
    return this.csrf.send(() =>
      this.http.put(`${this.base}/content/${site}/lists/${encodeURIComponent(listKey)}/order`, { ids }).pipe(timeout(AdminWebsiteService.TIMEOUT_MS)),
    );
  }

  /** Same upload endpoint as product images: JPEG, PNG or WebP up to 5 MB; returns the stored path. */
  uploadImage(file: File): Observable<string> {
    const body = new FormData();
    body.append('image', file);
    return this.write<{ path: string }>('post', '/uploads/images', body).pipe(map((r) => r.path));
  }

  private read<T>(path: string): Observable<T> {
    return this.http.get<{ data: T }>(`${this.base}${path}`).pipe(timeout(AdminWebsiteService.TIMEOUT_MS), map((r) => r.data));
  }

  private write<T>(method: 'post' | 'patch' | 'put', path: string, body: unknown): Observable<T> {
    return this.csrf
      .send(() => this.http.request<{ data: T }>(method.toUpperCase(), `${this.base}${path}`, { body }).pipe(timeout(AdminWebsiteService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }
}
