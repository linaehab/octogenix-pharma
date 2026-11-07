import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { AdminProduct, ProductListQuery, ProductStatusFilter, defaultVariant, primaryImage } from './admin-products.models';
import { AdminProductsService } from './admin-products.service';
import { adminProductsTranslations } from './admin-products-translations';
import { apiErrorMessages } from './api-errors';

/** /admin/products — every product with its single size's SKU, price and stock, from the API. */
@Component({
  selector: 'app-admin-products-list-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog],
  templateUrl: './admin-products-list-page.html',
  styleUrl: './admin-products-list-page.css',
})
export class AdminProductsListPage {
  private readonly api = inject(AdminProductsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly query = signal<ProductListQuery>({ search: '', status: '', featured: '', page: 1 });
  protected readonly products = signal<AdminProduct[]>([]);
  protected readonly meta = signal<{ current_page: number; last_page: number; total: number } | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly busyId = signal<number | null>(null);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string } | null>(null);
  private request: Subscription | null = null;

  protected readonly archivedView = computed(() => this.query().status === 'archived');
  protected readonly filtered = computed(() => {
    const q = this.query();
    return q.search.trim() !== '' || q.status !== '' || q.featured !== '';
  });

  constructor() {
    this.language.addTranslations(adminProductsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.list(this.query()).subscribe({
      next: (page) => {
        this.products.set(page.data);
        this.meta.set(page.meta);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected search(text: string): void {
    this.setQuery({ search: text, page: 1 });
  }

  protected setStatus(value: string): void {
    this.setQuery({ status: value as ProductStatusFilter, page: 1 });
  }

  protected setFeatured(value: string): void {
    this.setQuery({ featured: value as ProductListQuery['featured'], page: 1 });
  }

  protected clearFilters(searchBox: HTMLInputElement): void {
    searchBox.value = '';
    this.setQuery({ search: '', status: '', featured: '', page: 1 });
  }

  protected setQuery(change: Partial<ProductListQuery>): void {
    this.query.update((q) => ({ ...q, ...change }));
    this.notice.set(null);
    this.load();
  }

  protected goTo(page: number): void {
    this.setQuery({ page });
  }

  protected name(product: AdminProduct): string {
    return this.language.currentLanguage() === 'ar' ? product.name_ar || product.name_en : product.name_en || product.name_ar;
  }

  protected otherName(product: AdminProduct): string {
    return this.language.currentLanguage() === 'ar' ? product.name_en : product.name_ar;
  }

  protected size = defaultVariant;
  protected image = primaryImage;

  protected money(piastres: number | null | undefined): string {
    return piastres === null || piastres === undefined
      ? '—'
      : formatPrice({ amount_piastres: piastres, currency: 'EGP' }, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  }

  protected async hide(product: AdminProduct): Promise<void> {
    const ok = await this.confirm().ask({
      title: 'admin.products.hideTitle',
      message: 'admin.products.hideText',
      confirm: 'admin.products.hide',
      params: { name: this.name(product) },
    });
    if (ok) {
      this.change(product, () => this.api.update(product.id, { is_active: false }), 'admin.products.hidden');
    }
  }

  protected show(product: AdminProduct): void {
    this.change(product, () => this.api.update(product.id, { is_active: true }), 'admin.products.shown');
  }

  protected async archive(product: AdminProduct): Promise<void> {
    const orders = product.order_items_count ?? 0;
    const ok = await this.confirm().ask({
      title: 'admin.products.archiveTitle',
      message: 'admin.products.archiveText',
      confirm: 'admin.products.archive',
      params: { name: this.name(product) },
      tone: 'danger',
      details: [
        this.language.translate('admin.products.archiveKeeps'),
        orders > 0
          ? this.language.translate('admin.products.archiveOrders', { count: this.count(orders) })
          : this.language.translate('admin.products.archiveNoOrders'),
        this.language.translate('admin.products.archiveRestore'),
      ],
    });
    if (ok) {
      this.change(product, () => this.api.archive(product.id), 'admin.products.archived');
    }
  }

  protected restore(product: AdminProduct): void {
    this.change(product, () => this.api.restore(product.id), 'admin.products.restored');
  }

  private change(product: AdminProduct, action: () => Observable<unknown>, successKey: string): void {
    this.busyId.set(product.id);
    this.notice.set(null);
    action().subscribe({
      next: () => {
        this.busyId.set(null);
        this.notice.set({ kind: 'success', text: this.language.translate(successKey, { name: this.name(product) }) });
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        if (this.sessionEnded(error)) {
          return;
        }
        const messages = apiErrorMessages(error);
        this.notice.set({
          kind: 'error',
          text: [this.language.translate('admin.products.actionFailed'), ...messages].join(' '),
        });
      },
    });
  }

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
      void this.router.navigateByUrl('/admin/login');
      return true;
    }
    return false;
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
