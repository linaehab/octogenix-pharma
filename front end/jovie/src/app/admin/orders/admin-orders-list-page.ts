import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { Money } from '../../jovie/data/jovie-product.models';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { adminProductsTranslations } from '../products/admin-products-translations';
import { OrderListPage, OrderListQuery, OrderListRow } from './admin-orders.models';
import { AdminOrdersService } from './admin-orders.service';
import { adminOrdersTranslations } from './admin-orders-translations';

const EMPTY: OrderListQuery = { search: '', status: '', payment_status: '', payment_method: '', governorate_id: '', from: '', to: '', page: 1 };
export const ORDER_STATUSES = ['pending_payment', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'returned'];

/** /admin/orders — every order, newest first, filtered and paged by the API. */
@Component({
  selector: 'app-admin-orders-list-page',
  imports: [RouterLink, TranslatePipe, AdminState],
  templateUrl: './admin-orders-list-page.html',
  styleUrl: './admin-orders-list-page.css',
})
export class AdminOrdersListPage {
  private readonly api = inject(AdminOrdersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly query = signal<OrderListQuery>({ ...EMPTY });
  protected readonly rows = signal<OrderListRow[]>([]);
  protected readonly meta = signal<OrderListPage['meta'] | null>(null);
  protected readonly governorates = signal<OrderListPage['options']['governorates']>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private request: Subscription | null = null;
  private exportRequest: Subscription | null = null;
  /** Exporting needs payments.manage too (the totals), like the report exports. */
  protected readonly canExport = computed(() => this.auth.can({ permissions: ['orders.view', 'payments.manage'] }));
  protected readonly exporting = signal(false);
  protected readonly exported = signal<string | null>(null);
  protected readonly exportFailed = signal(false);

  protected readonly filtered = computed(() => Object.entries(this.query()).some(([key, value]) => key !== 'page' && value !== ''));

  constructor() {
    this.language.addTranslations(adminProductsTranslations);
    this.language.addTranslations(adminOrdersTranslations);
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      this.exportRequest?.unsubscribe();
    });
    this.load();
  }

  /** Every order matching the applied filters, as an Excel file (one download at a time). */
  protected exportExcel(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exported.set(null);
    this.exportFailed.set(false);
    this.exportRequest = this.api.export(this.query(), this.language.currentLanguage()).subscribe({
      next: (name) => {
        this.exporting.set(false);
        this.exported.set(name);
      },
      error: (error: unknown) => {
        this.exporting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.sessionEnded();
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.exportFailed.set(true);
      },
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.exported.set(null);
    this.exportFailed.set(false);
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.list(this.query()).subscribe({
      next: (page) => {
        this.rows.set(page.data);
        this.meta.set(page.meta);
        this.governorates.set(page.options.governorates);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.auth.sessionEnded();
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected apply(form: HTMLFormElement): void {
    const value = (name: string) => ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '').trim();
    this.query.set({
      search: value('search'),
      status: value('status'),
      payment_status: value('payment_status'),
      payment_method: value('payment_method'),
      governorate_id: value('governorate_id'),
      from: value('from'),
      to: value('to'),
      page: 1,
    });
    this.load();
  }

  protected clear(form: HTMLFormElement): void {
    form.reset();
    this.query.set({ ...EMPTY });
    this.load();
  }

  protected goTo(page: number): void {
    this.query.update((q) => ({ ...q, page }));
    this.load();
  }

  protected money(value: Money): string {
    return formatPrice(value, this.language.currentLanguage());
  }

  protected place(row: { en: string; ar: string }): string {
    return this.language.currentLanguage() === 'ar' ? row.ar || row.en : row.en || row.ar;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value))
      : '—';
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
