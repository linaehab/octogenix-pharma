import { HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { ApiProduct } from './jovie-product.models';
import { PREVIEW_CATALOG_ENABLED, PREVIEW_PRODUCTS } from './preview-catalog';

/** Products shown when the API returns no active Jovie product (empty list = show the empty state). */
export const JOVIE_PREVIEW_PRODUCTS = new InjectionToken<ApiProduct[]>('JOVIE_PREVIEW_PRODUCTS', {
  providedIn: 'root',
  factory: () => (PREVIEW_CATALOG_ENABLED ? PREVIEW_PRODUCTS : []),
});

export type CatalogStatus = 'loading' | 'ready' | 'error';

interface CatalogState {
  status: CatalogStatus;
  products: ApiProduct[];
  /** True when the products come from the preview data, not from the API. */
  isPreview: boolean;
}

/** Jovie products from GET /api/v1/products?brand=jovie, shared by the Shop and Feeding Guide. */
@Injectable({ providedIn: 'root' })
export class JovieCatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly previewProducts = inject(JOVIE_PREVIEW_PRODUCTS);

  static readonly TIMEOUT_MS = 8000;

  private readonly state = signal<CatalogState>({ status: 'loading', products: [], isPreview: false });
  private requested = false;

  readonly status = computed(() => this.state().status);
  readonly products = computed(() => this.state().products);
  readonly isPreview = computed(() => this.state().isPreview);

  /** Loads once; later calls reuse the result. Without an API base URL (prerender) it stays 'loading'. */
  load(): void {
    if (this.requested || this.baseUrl === null) {
      return;
    }
    this.requested = true;
    this.fetch();
  }

  retry(): void {
    if (this.baseUrl === null) {
      return;
    }
    this.state.set({ status: 'loading', products: [], isPreview: false });
    this.fetch();
  }

  private fetch(): void {
    this.http
      .get<{ data: ApiProduct[] }>(`${this.baseUrl}/api/v1/products`, { params: { brand: 'jovie' } })
      .pipe(timeout(JovieCatalogService.TIMEOUT_MS))
      .subscribe({
        next: (response) => {
          const products = [...(response.data ?? [])].sort((a, b) => (a.stage ?? 99) - (b.stage ?? 99));
          this.state.set(
            products.length
              ? { status: 'ready', products, isPreview: false }
              : { status: 'ready', products: this.previewProducts, isPreview: this.previewProducts.length > 0 },
          );
        },
        error: () => this.state.set({ status: 'error', products: [], isPreview: false }),
      });
  }
}
