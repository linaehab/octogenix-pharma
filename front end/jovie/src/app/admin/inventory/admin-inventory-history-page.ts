import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { adminProductsTranslations } from '../products/admin-products-translations';
import { MovementFilters, MovementPage, MovementRow } from './admin-inventory.models';
import { AdminInventoryService } from './admin-inventory.service';
import { adminInventoryTranslations } from './admin-inventory-translations';

const EMPTY: MovementFilters = { variant_id: '', reason: '', admin_id: '', order: '', from: '', to: '', page: 1 };

/**
 * /admin/inventory/movements — every stock movement, newest first. Read-only: a wrong adjustment
 * is corrected with a new movement, never by editing history.
 */
@Component({
  selector: 'app-admin-inventory-history-page',
  imports: [RouterLink, TranslatePipe, AdminState],
  templateUrl: './admin-inventory-history-page.html',
  styleUrl: './admin-inventory-history-page.css',
})
export class AdminInventoryHistoryPage {
  private readonly api = inject(AdminInventoryService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly filters = signal<MovementFilters>({ ...EMPTY });
  protected readonly rows = signal<MovementRow[]>([]);
  protected readonly meta = signal<MovementPage['meta'] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => Object.entries(this.filters()).some(([key, value]) => key !== 'page' && value !== ''));

  constructor() {
    this.language.addTranslations(adminProductsTranslations);
    this.language.addTranslations(adminInventoryTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    // "History" from the inventory list opens this page for one product.
    const variant = inject(ActivatedRoute).snapshot.queryParamMap.get('variant_id');
    if (variant && /^\d+$/.test(variant)) {
      this.filters.update((f) => ({ ...f, variant_id: variant }));
    }
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.movements(this.filters()).subscribe({
      next: (page) => {
        this.rows.set(page.data);
        this.meta.set(page.meta);
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
    this.filters.set({
      variant_id: value('variant_id'),
      reason: value('reason'),
      admin_id: value('admin_id'),
      order: value('order'),
      from: value('from'),
      to: value('to'),
      page: 1,
    });
    this.load();
  }

  protected clear(form: HTMLFormElement): void {
    form.reset();
    this.filters.set({ ...EMPTY });
    this.load();
  }

  protected goTo(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
    this.load();
  }

  protected name(row: { name_en: string | null; name_ar: string | null; sku: string | null }): string {
    return (this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? row.sku ?? '—';
  }

  protected change(value: number): string {
    const formatted = new Intl.NumberFormat(this.locale(), { signDisplay: 'always' }).format(value);
    return formatted;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value));
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
