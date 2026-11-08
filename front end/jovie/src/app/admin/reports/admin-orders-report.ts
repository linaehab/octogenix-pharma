import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';
import { adminOrdersTranslations } from '../orders/admin-orders-translations';
import { AdminReportExport, ExportFormat } from './admin-report-export';
import { OrdersReport, OrdersReportFilters, ReportPeriod } from './admin-reports.models';
import { AdminReportsService } from './admin-reports.service';
import { count, dateTime, egp } from './report-format';

const NO_FILTERS: OrdersReportFilters = { status: '', payment_status: '', payment_method: '', governorate_id: '' };

/** /admin/reports/orders — orders placed in the period, filtered and paged by the API, with their saved totals. */
@Component({
  selector: 'app-admin-orders-report',
  imports: [RouterLink, TranslatePipe, AdminState, AdminStatCard, AdminReportExport],
  templateUrl: './admin-orders-report.html',
})
export class AdminOrdersReport {
  private readonly reports = inject(AdminReportsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly exporter = viewChild(AdminReportExport);

  protected readonly statuses = ['pending_payment', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'returned'];
  protected readonly filters = signal<OrdersReportFilters>({ ...NO_FILTERS });
  protected readonly page = signal(1);
  protected readonly report = signal<OrdersReport | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly governorates = signal<{ id: number; name: { en: string; ar: string } }[]>([]);
  private request: Subscription | null = null;
  private governorateRequest: Subscription | null = null;

  protected readonly exportRun = (format: ExportFormat) =>
    this.reports.export('orders', this.reports.period(), this.language.currentLanguage(), this.filters(), format);

  constructor() {
    this.language.addTranslations(adminOrdersTranslations);
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      this.governorateRequest?.unsubscribe();
    });
    // Loaded once, apart from the report (reloading the report must not cancel it).
    this.governorateRequest = this.reports.governorates().subscribe({ next: (list) => this.governorates.set(list), error: () => this.governorates.set([]) });
    effect(() => {
      const period = this.reports.period();
      untracked(() => {
        this.page.set(1);
        this.load(period);
      });
    });
  }

  protected load(period: ReportPeriod = this.reports.period()): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.exporter()?.reset();
    this.request = this.reports.orders(period, this.filters(), this.page()).subscribe({
        next: (report) => {
          this.report.set(report);
          this.state.set('ready');
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.endSession();
            return;
          }
          this.state.set('error');
        },
      });
  }

  protected apply(form: HTMLFormElement): void {
    const value = (name: string) => ((form.elements.namedItem(name) as HTMLSelectElement | null)?.value ?? '').trim();
    this.filters.set({ status: value('status'), payment_status: value('payment_status'), payment_method: value('payment_method'), governorate_id: value('governorate_id') });
    this.page.set(1);
    this.load();
  }

  protected clear(form: HTMLFormElement): void {
    form.reset();
    this.filters.set({ ...NO_FILTERS });
    this.page.set(1);
    this.load();
  }

  protected goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected filtered(): boolean {
    return Object.values(this.filters()).some((v) => v !== '');
  }

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected place(name: { en: string; ar: string }): string {
    return this.language.currentLanguage() === 'ar' ? name.ar || name.en : name.en || name.ar;
  }

  protected money(piastres: number): string {
    return egp(piastres, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return count(value, this.language.currentLanguage());
  }

  protected date(iso: string): string {
    return dateTime(iso, this.language.currentLanguage());
  }
}
