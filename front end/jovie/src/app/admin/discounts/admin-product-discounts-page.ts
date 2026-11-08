import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { DiscountState, PageMeta, ProductDiscountRow } from './admin-discounts.models';
import { AdminDiscountsNav } from './admin-discounts-nav';
import { AdminDiscountsService } from './admin-discounts.service';
import { adminDiscountsTranslations } from './admin-discounts-translations';
import { AdminProductDiscountDialog } from './admin-product-discount-dialog';
import { cairoDate, discountAmount, money } from './discount-format';

/**
 * /admin/discounts/products — every product with its regular price, its discount and what
 * customers pay now. Search, filters and pages are handled by the API.
 */
@Component({
  selector: 'app-admin-product-discounts-page',
  imports: [TranslatePipe, AdminState, AdminDiscountsNav, AdminProductDiscountDialog, AdminConfirmDialog],
  templateUrl: './admin-product-discounts-page.html',
  styleUrl: './admin-discounts.css',
})
export class AdminProductDiscountsPage {
  private readonly api = inject(AdminDiscountsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(AdminProductDiscountDialog);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly states: DiscountState[] = ['active', 'scheduled', 'inactive', 'expired', 'none'];
  protected readonly rows = signal<ProductDiscountRow[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly notice = signal<{ text: string; tone: 'success' | 'error' } | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly search = signal('');
  protected readonly state = signal('');
  private request: Subscription | null = null;

  constructor() {
    this.language.addTranslations(adminDiscountsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load(1);
  }

  protected filtered(): boolean {
    return this.search().trim() !== '' || this.state() !== '';
  }

  protected load(page = this.meta()?.current_page ?? 1): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.products({ search: this.search().trim(), state: this.state(), page }).subscribe({
      next: (result) => {
        this.rows.set(result.data);
        this.meta.set(result.meta);
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

  protected apply(searchText: string, state: string): void {
    this.search.set(searchText);
    this.state.set(state);
    this.load(1);
  }

  protected clear(searchBox: HTMLInputElement, stateBox: HTMLSelectElement): void {
    searchBox.value = '';
    stateBox.value = '';
    this.apply('', '');
  }

  protected edit(row: ProductDiscountRow): void {
    this.notice.set(null);
    this.dialog().open(row);
  }

  protected saved(row: ProductDiscountRow): void {
    this.replace(row);
    this.notice.set({ text: this.language.translate('admin.productDiscounts.saved', { name: this.name(row) }), tone: 'success' });
  }

  protected replace(row: ProductDiscountRow): void {
    this.rows.update((rows) => rows.map((r) => (r.variant_id === row.variant_id ? row : r)));
  }

  /** Turns the discount on or off, keeping everything else as it is. */
  protected toggle(row: ProductDiscountRow): void {
    const d = row.discount;
    if (!d || this.busy() !== null) {
      return;
    }
    this.notice.set(null);
    this.busy.set(row.variant_id);
    this.api.setProductDiscount(row.variant_id, { ...d, is_active: !d.is_active }, d).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.replace(updated);
        const key = updated.discount?.is_active ? 'admin.productDiscounts.turnedOn' : 'admin.productDiscounts.turnedOff';
        this.notice.set({ text: this.language.translate(key, { name: this.name(updated) }), tone: 'success' });
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  protected async remove(row: ProductDiscountRow): Promise<void> {
    if (!row.discount || this.busy() !== null) {
      return;
    }
    this.notice.set(null);
    const confirmed = await this.confirm().ask({
      title: 'admin.productDiscounts.removeTitle',
      message: 'admin.productDiscounts.removeMessage',
      confirm: 'admin.productDiscounts.removeConfirm',
      params: { name: this.name(row) },
      tone: 'danger',
    });
    if (!confirmed) {
      return;
    }
    this.busy.set(row.variant_id);
    this.api.removeProductDiscount(row.variant_id, row.discount).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.replace(updated);
        this.notice.set({ text: this.language.translate('admin.productDiscounts.removed', { name: this.name(updated) }), tone: 'success' });
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected name(row: ProductDiscountRow): string {
    const n = row.product.name;
    return (this.language.currentLanguage() === 'ar' ? n.ar || n.en : n.en || n.ar) ?? row.sku;
  }

  protected money(piastres: number | null): string {
    return piastres === null ? this.language.translate('admin.productDiscounts.noPrice') : money(piastres, this.language);
  }

  protected amount(row: ProductDiscountRow): string {
    return row.discount ? discountAmount(row.discount.type, row.discount.value, this.language) : '—';
  }

  protected period(row: ProductDiscountRow): string {
    const d = row.discount;
    if (!d) {
      return '—';
    }
    const from = d.starts_at ? cairoDate(d.starts_at, this.language) : null;
    const to = d.ends_at ? cairoDate(d.ends_at, this.language) : null;
    if (from && to) {
      return this.language.translate('admin.productDiscounts.fromUntil', { from, to });
    }
    if (from) {
      return this.language.translate('admin.productDiscounts.from', { date: from });
    }
    return to ? this.language.translate('admin.productDiscounts.until', { date: to }) : this.language.translate('admin.productDiscounts.always');
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value);
  }

  private failed(error: unknown): void {
    this.busy.set(null);
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.endSession();
      return;
    }
    const current = changedMeanwhile<ProductDiscountRow>(error);
    if (current) {
      this.replace(current);
      this.notice.set({ text: this.language.translate('admin.discounts.changedMeanwhile'), tone: 'error' });
      return;
    }
    this.notice.set({ text: [this.language.translate('admin.discounts.saveFailed'), ...apiErrorMessages(error)].join(' '), tone: 'error' });
  }
}
