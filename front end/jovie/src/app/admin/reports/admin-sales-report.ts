import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';
import { adminOrdersTranslations } from '../orders/admin-orders-translations';
import { AdminReportExport } from './admin-report-export';
import { ReportPeriod, SalesReport, TrendPoint } from './admin-reports.models';
import { AdminReportsService } from './admin-reports.service';
import { count, egp, periodLabel } from './report-format';

const STATUSES = ['pending_payment', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'expired', 'returned'];

/** /admin/reports/sales — order value, collected payments, outstanding amounts and their trend. */
@Component({
  selector: 'app-admin-sales-report',
  imports: [TranslatePipe, AdminState, AdminStatCard, AdminReportExport],
  templateUrl: './admin-sales-report.html',
})
export class AdminSalesReport {
  private readonly reports = inject(AdminReportsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly exporter = viewChild(AdminReportExport);

  protected readonly statuses = STATUSES;
  protected readonly report = signal<SalesReport | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly hovered = signal<number | null>(null);
  private request: Subscription | null = null;

  /** Top of the single EGP axis: the largest bar rounded up to a readable number. */
  protected readonly axisMax = computed(() => {
    const max = Math.max(0, ...(this.report()?.trend ?? []).flatMap((p) => [p.order_value_piastres, p.collected_piastres]));
    if (max === 0) {
      return 0;
    }
    const step = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / step) * step;
  });

  protected readonly half = computed(() => Math.round(this.axisMax() / 2));

  /** Label every n-th bucket so labels never collide. */
  protected readonly tickEvery = computed(() => Math.max(1, Math.ceil((this.report()?.trend.length ?? 0) / 10)));

  protected readonly empty = computed(() => {
    const r = this.report();
    return !!r && r.orders.placed.count === 0 && r.payments.collected.count === 0 && r.payments.test.count === 0;
  });

  protected readonly exportRun = () => this.reports.export('sales', this.reports.period(), this.language.currentLanguage());

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.language.addTranslations(adminOrdersTranslations);
    effect(() => {
      const period = this.reports.period();
      untracked(() => this.load(period));
    });
  }

  protected load(period: ReportPeriod = this.reports.period()): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.exporter()?.reset();
    this.request = this.reports.sales(period).subscribe({
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

  protected endSession(): void {
    this.auth.sessionEnded();
    void this.router.navigateByUrl('/admin/login');
  }

  protected height(piastres: number): number {
    const max = this.axisMax();
    return max === 0 ? 0 : (piastres / max) * 100;
  }

  protected tip(point: TrendPoint): string {
    return [
      this.period(point.period),
      `${this.language.translate('admin.reports.sales.orderValue')}: ${this.money(point.order_value_piastres)}`,
      `${this.language.translate('admin.reports.sales.collectedSeries')}: ${this.money(point.collected_piastres)}`,
      `${this.language.translate('admin.reports.sales.orders')}: ${this.count(point.orders_count)}`,
    ].join(' · ');
  }

  protected money(piastres: number): string {
    return egp(piastres, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return count(value, this.language.currentLanguage());
  }

  protected period(key: string, short = false): string {
    return periodLabel(key, this.language.currentLanguage(), short);
  }
}
