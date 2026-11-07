import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { AdminSettingsNav } from './admin-settings-nav';
import { AdminGovernorate, ShippingFilter } from './admin-settings.models';
import { AdminSettingsService } from './admin-settings.service';
import { adminSettingsTranslations } from './admin-settings-translations';
import { AdminShippingFeeDialog } from './admin-shipping-fee-dialog';

/** Arabic letters that are often typed interchangeably, folded so "اسوان" finds "أسوان". */
function searchable(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    // Harakat, and the hamza/madda marks NFKD splits off أ إ آ.
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * /admin/settings/shipping — every governorate in the database with its shipping fee and delivery
 * switch. The list is short (Egypt's governorates), so search and filters run in the browser.
 */
@Component({
  selector: 'app-admin-shipping-page',
  imports: [TranslatePipe, AdminState, AdminSettingsNav, AdminShippingFeeDialog],
  templateUrl: './admin-shipping-page.html',
  styleUrl: './admin-shipping-page.css',
})
export class AdminShippingPage {
  private readonly api = inject(AdminSettingsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly feeDialog = viewChild.required(AdminShippingFeeDialog);

  protected readonly rows = signal<AdminGovernorate[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly filter = signal<ShippingFilter>('');
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => this.search().trim() !== '' || this.filter() !== '');

  protected readonly visible = computed(() => {
    const term = searchable(this.search());
    const filter = this.filter();
    return this.rows().filter(
      (row) =>
        (filter === '' || row.is_deliverable === (filter === 'enabled')) &&
        (term === '' || [row.name_en, row.name_ar, row.code].some((text) => searchable(text).includes(term))),
    );
  });

  protected readonly counts = computed(() => {
    const rows = this.rows();
    const on = rows.filter((row) => row.is_deliverable).length;
    return { total: rows.length, on, off: rows.length - on, noFee: rows.filter((row) => row.shipping_fee_piastres === null).length };
  });

  constructor() {
    this.language.addTranslations(adminSettingsTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.governorates().subscribe({
      next: (rows) => {
        this.rows.set(rows);
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

  protected setFilter(value: string): void {
    this.filter.set(value as ShippingFilter);
  }

  protected clear(searchBox: HTMLInputElement): void {
    searchBox.value = '';
    this.search.set('');
    this.filter.set('');
  }

  protected edit(row: AdminGovernorate): void {
    this.notice.set(null);
    this.feeDialog().open(row);
  }

  protected saved(row: AdminGovernorate): void {
    this.replace(row);
    this.notice.set(this.language.translate('admin.shipping.saved', { name: this.name(row) }));
  }

  /** Changed by someone else meanwhile: show its current values in the list too. */
  protected replace(row: AdminGovernorate): void {
    this.rows.update((rows) => rows.map((r) => (r.id === row.id ? row : r)));
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected name(row: AdminGovernorate): string {
    return this.language.currentLanguage() === 'ar' ? row.name_ar : row.name_en;
  }

  protected money(piastres: number | null): string | null {
    return piastres === null ? null : formatPrice({ amount_piastres: piastres, currency: 'EGP' }, this.language.currentLanguage());
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
