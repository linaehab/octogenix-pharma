import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { Money } from '../../jovie/data/jovie-product.models';
import { AdminAuthService } from '../admin-auth.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';
import { OrderListPage, OrderListRow } from '../orders/admin-orders.models';
import { adminOrdersTranslations } from '../orders/admin-orders-translations';
import { CustomerAddress, CustomerDetails } from './admin-customers.models';
import { AdminCustomersService } from './admin-customers.service';
import { adminCustomersTranslations } from './admin-customers-translations';

/**
 * /admin/customers/:id — one customer's account details, saved addresses and order history
 * (view-only). Orders open on the existing order page; their history needs orders.view.
 */
@Component({
  selector: 'app-admin-customer-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminStatCard],
  templateUrl: './admin-customer-page.html',
  styleUrl: './admin-customer-page.css',
})
export class AdminCustomerPage {
  private readonly api = inject(AdminCustomersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private id = 0;

  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  protected readonly customer = signal<CustomerDetails | null>(null);
  /** The order history is shown only to admins who may view orders (the API checks orders.view too). */
  protected readonly canViewOrders = this.auth.can({ permissions: ['orders.view'] });
  protected readonly orders = signal<OrderListRow[]>([]);
  protected readonly ordersMeta = signal<OrderListPage['meta'] | null>(null);
  protected readonly ordersState = signal<'loading' | 'ready' | 'error'>('loading');
  private ordersPage = 1;
  private requests: Subscription[] = [];

  constructor() {
    this.language.addTranslations(adminOrdersTranslations);
    this.language.addTranslations(adminCustomersTranslations);
    inject(DestroyRef).onDestroy(() => this.cancel());
    // The same page can move from one customer to another (the route is reused), so follow the id.
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = Number(params.get('id'));
        this.customer.set(null);
        this.orders.set([]);
        this.ordersMeta.set(null);
        this.load();
      });
  }

  protected load(): void {
    this.cancel();
    if (!Number.isInteger(this.id) || this.id < 1) {
      this.state.set('notFound');
      return;
    }
    this.state.set('loading');
    this.requests.push(
      this.api.get(this.id).subscribe({
        next: (customer) => {
          this.customer.set(customer);
          this.state.set('ready');
          if (this.canViewOrders) {
            this.loadOrders(1);
          }
        },
        error: (error: unknown) => {
          if (this.sessionEnded(error)) {
            return;
          }
          this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error');
        },
      }),
    );
  }

  protected loadOrders(page: number = this.ordersPage): void {
    this.ordersPage = page;
    this.ordersState.set('loading');
    this.requests.push(
      this.api.orders(this.id, page).subscribe({
        next: (result) => {
          this.orders.set(result.data);
          this.ordersMeta.set(result.meta);
          this.ordersState.set('ready');
        },
        error: (error: unknown) => {
          if (!this.sessionEnded(error)) {
            this.ordersState.set('error');
          }
        },
      }),
    );
  }

  protected name(customer: CustomerDetails): string {
    return `${customer.first_name} ${customer.last_name}`.trim();
  }

  protected place(address: CustomerAddress): string {
    const governorate = address.governorate?.name;
    const name = governorate ? (this.language.currentLanguage() === 'ar' ? governorate.ar || governorate.en : governorate.en || governorate.ar) : '';
    return [address.area, address.city, name].filter(Boolean).join(this.separator());
  }

  protected street(address: CustomerAddress): string {
    return [address.street, address.building, address.floor, address.apartment].filter(Boolean).join(this.separator());
  }

  private separator(): string {
    return this.language.currentLanguage() === 'ar' ? '، ' : ', ';
  }

  protected money(value: Money): string {
    return formatPrice(value, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null, withTime = true): string {
    return value
      ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'Africa/Cairo' }).format(new Date(value))
      : '—';
  }

  private cancel(): void {
    this.requests.forEach((r) => r.unsubscribe());
    this.requests = [];
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
