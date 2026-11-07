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
import { CustomerPage, CustomerQuery, CustomerRow, CustomerStatusFilter } from './admin-customers.models';
import { AdminCustomersService } from './admin-customers.service';
import { adminCustomersTranslations } from './admin-customers-translations';

const EMPTY: CustomerQuery = { search: '', status: '', registered_from: '', registered_to: '', page: 1 };

/** /admin/customers — customer accounts, newest first, searched, filtered and paged by the API. View-only. */
@Component({
  selector: 'app-admin-customers-list-page',
  imports: [RouterLink, TranslatePipe, AdminState],
  templateUrl: './admin-customers-list-page.html',
  styleUrl: './admin-customers-list-page.css',
})
export class AdminCustomersListPage {
  private readonly api = inject(AdminCustomersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly query = signal<CustomerQuery>({ ...EMPTY });
  protected readonly rows = signal<CustomerRow[]>([]);
  protected readonly meta = signal<CustomerPage['meta'] | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private request: Subscription | null = null;

  protected readonly filtered = computed(() => Object.entries(this.query()).some(([key, value]) => key !== 'page' && value !== ''));

  constructor() {
    this.language.addTranslations(adminCustomersTranslations);
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.list(this.query()).subscribe({
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
    this.query.set({
      search: value('search'),
      status: value('status') as CustomerStatusFilter,
      registered_from: value('registered_from'),
      registered_to: value('registered_to'),
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

  protected name(row: CustomerRow): string {
    return `${row.first_name} ${row.last_name}`.trim();
  }

  protected money(value: Money): string {
    return formatPrice(value, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(value)) : '—';
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
