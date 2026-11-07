import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';
import { StockRow, StockStatus, StockSummary } from './admin-inventory.models';
import { AdminInventoryService } from './admin-inventory.service';
import { adminProductsTranslations } from '../products/admin-products-translations';
import { adminInventoryTranslations } from './admin-inventory-translations';
import { AdminStockAdjustDialog } from './admin-stock-adjust-dialog';
import { AdminThresholdDialog } from './admin-threshold-dialog';

/**
 * /admin/inventory — stock of every product (its single size), straight from the API: counts,
 * alerts for low and out-of-stock products, search and filters, adjustments and thresholds.
 */
@Component({
  selector: 'app-admin-inventory-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminStatCard, AdminStockAdjustDialog, AdminThresholdDialog],
  templateUrl: './admin-inventory-page.html',
  styleUrl: './admin-inventory-page.css',
})
export class AdminInventoryPage {
  private readonly api = inject(AdminInventoryService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly adjustDialog = viewChild.required(AdminStockAdjustDialog);
  private readonly thresholdDialog = viewChild.required(AdminThresholdDialog);

  protected readonly query = signal<{ search: string; status: StockStatus | ''; page: number }>({ search: '', status: '', page: 1 });
  protected readonly rows = signal<StockRow[]>([]);
  protected readonly summary = signal<StockSummary | null>(null);
  protected readonly meta = signal<{ current_page: number; last_page: number; total: number } | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly notice = signal<string | null>(null);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => this.query().search.trim() !== '' || this.query().status !== '');

  constructor() {
    // Shared labels (search, SKU, pages) come from the Products texts.
    this.language.addTranslations(adminProductsTranslations);
    this.language.addTranslations(adminInventoryTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.stock(this.query()).subscribe({
      next: (page) => {
        this.rows.set(page.data);
        this.summary.set(page.meta.summary);
        this.meta.set(page.meta);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.endSession();
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected setQuery(change: Partial<{ search: string; status: StockStatus | ''; page: number }>): void {
    this.query.update((q) => ({ ...q, ...change }));
    this.load();
  }

  protected setStatus(status: string): void {
    this.setQuery({ status: status as StockStatus | '', page: 1 });
  }

  protected clear(searchBox: HTMLInputElement): void {
    searchBox.value = '';
    this.setQuery({ search: '', status: '', page: 1 });
  }

  protected adjust(row: StockRow): void {
    this.notice.set(null);
    this.adjustDialog().open(row);
  }

  protected editThreshold(row: StockRow): void {
    this.notice.set(null);
    this.thresholdDialog().open(row);
  }

  protected adjusted(event: { row: StockRow; stock: number }): void {
    this.notice.set(this.language.translate('admin.inventory.adjusted', { name: this.name(event.row), count: this.count(event.stock) }));
    this.load();
  }

  protected thresholdSaved(row: StockRow): void {
    this.notice.set(this.language.translate('admin.inventory.thresholdSaved', { name: this.name(row) }));
    this.load();
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected name(row: StockRow): string {
    return (this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? row.sku;
  }

  protected otherName(row: StockRow): string | null {
    return this.language.currentLanguage() === 'ar' ? row.name_en : row.name_ar;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
