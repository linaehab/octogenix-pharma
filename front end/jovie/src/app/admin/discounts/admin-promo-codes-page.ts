import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { PageMeta, PromoCode, PromoState } from './admin-discounts.models';
import { AdminDiscountsNav } from './admin-discounts-nav';
import { AdminDiscountsService } from './admin-discounts.service';
import { adminDiscountsTranslations } from './admin-discounts-translations';
import { AdminPromoCodeDialog } from './admin-promo-code-dialog';
import { cairoDate, discountAmount, money } from './discount-format';

/**
 * /admin/discounts/promo-codes — every promo code with its discount, conditions, uses and status.
 * Codes are never deleted; they are switched off. Usage figures come from the orders (API).
 */
@Component({
  selector: 'app-admin-promo-codes-page',
  imports: [TranslatePipe, AdminState, AdminDiscountsNav, AdminPromoCodeDialog],
  templateUrl: './admin-promo-codes-page.html',
  styleUrl: './admin-discounts.css',
})
export class AdminPromoCodesPage {
  private readonly api = inject(AdminDiscountsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(AdminPromoCodeDialog);

  protected readonly states: PromoState[] = ['active', 'scheduled', 'inactive', 'expired'];
  protected readonly rows = signal<PromoCode[]>([]);
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
    this.request = this.api.promoCodes({ search: this.search().trim(), state: this.state(), page }).subscribe({
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

  protected create(): void {
    this.notice.set(null);
    this.dialog().open(null);
  }

  /** Opens the code with its usage figures (loaded fresh). */
  protected edit(row: PromoCode): void {
    if (this.busy() !== null) {
      return;
    }
    this.notice.set(null);
    this.busy.set(row.id);
    this.api.promoCode(row.id).subscribe({
      next: (promo) => {
        this.busy.set(null);
        this.replace(promo);
        this.dialog().open(promo);
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  protected saved(event: { promo: PromoCode; created: boolean }): void {
    if (event.created) {
      this.load(1);
    } else {
      this.replace(event.promo);
    }
    const key = event.created ? 'admin.promo.created' : 'admin.promo.saved';
    this.notice.set({ text: this.language.translate(key, { code: event.promo.code }), tone: 'success' });
  }

  protected replace(promo: PromoCode): void {
    this.rows.update((rows) => rows.map((r) => (r.id === promo.id ? { ...r, ...promo } : r)));
  }

  protected toggle(row: PromoCode): void {
    if (this.busy() !== null) {
      return;
    }
    this.notice.set(null);
    this.busy.set(row.id);
    this.api.updatePromoCode(row.id, { is_active: !row.is_active, expected_updated_at: row.updated_at }).subscribe({
      next: (promo) => {
        this.busy.set(null);
        this.replace(promo);
        const key = promo.is_active ? 'admin.promo.turnedOn' : 'admin.promo.turnedOff';
        this.notice.set({ text: this.language.translate(key, { code: promo.code }), tone: 'success' });
      },
      error: (error: unknown) => this.failed(error),
    });
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected amount(row: PromoCode): string {
    return discountAmount(row.discount_type, row.discount_value, this.language);
  }

  protected minimum(row: PromoCode): string {
    return row.min_order_piastres === null ? this.language.translate('admin.promo.noMinimum') : money(row.min_order_piastres, this.language);
  }

  protected validity(row: PromoCode): string {
    const from = row.starts_at ? cairoDate(row.starts_at, this.language) : null;
    const to = row.ends_at ? cairoDate(row.ends_at, this.language) : null;
    if (from && to) {
      return this.language.translate('admin.productDiscounts.fromUntil', { from, to });
    }
    if (from) {
      return this.language.translate('admin.productDiscounts.from', { date: from });
    }
    return to ? this.language.translate('admin.productDiscounts.until', { date: to }) : this.language.translate('admin.productDiscounts.always');
  }

  protected uses(row: PromoCode): string {
    const used = this.count(row.used_count);
    return row.usage_limit === null
      ? `${used} · ${this.language.translate('admin.promo.unlimited')}`
      : this.language.translate('admin.promo.usesOf', { used, limit: this.count(row.usage_limit) });
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
    const current = changedMeanwhile<PromoCode>(error);
    if (current) {
      this.replace(current);
      this.notice.set({ text: this.language.translate('admin.discounts.changedMeanwhile'), tone: 'error' });
      return;
    }
    this.notice.set({ text: [this.language.translate('admin.discounts.saveFailed'), ...apiErrorMessages(error)].join(' '), tone: 'error' });
  }
}
