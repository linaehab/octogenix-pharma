import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminState } from '../components/admin-state';
import { AdminReportExport, ExportFormat } from './admin-report-export';
import { ProductReportRow, ReportPeriod } from './admin-reports.models';
import { AdminReportsService } from './admin-reports.service';
import { count, egp } from './report-format';

/** /admin/reports/products — units, orders and gross value per product from the saved order lines. */
@Component({
  selector: 'app-admin-products-report',
  imports: [TranslatePipe, AdminState, AdminReportExport],
  template: `
    <div class="rep-toolbar">
      <p class="rep-definitions">{{ 'admin.reports.products.lead' | translate }}</p>
      <app-admin-report-export [run]="exportRun" [disabled]="state() !== 'ready' || !rows().length" (sessionEnded)="endSession()" />
    </div>
    <section class="adm-panel rep-panel" aria-labelledby="rep-products" [attr.aria-busy]="state() === 'loading'">
      <h2 id="rep-products" class="adm-visually-hidden">{{ 'admin.reports.tab.products' | translate }}</h2>
      @switch (state()) {
        @case ('loading') {
          <app-admin-state kind="loading" />
        }
        @case ('error') {
          <app-admin-state kind="error" (retry)="load()" />
        }
        @default {
          @if (!rows().length) {
            <app-admin-state kind="empty" message="admin.reports.products.none" />
          } @else {
            <table class="rep-table rep-cards-narrow">
              <thead>
                <tr>
                  <th scope="col">{{ 'admin.reports.products.product' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.units' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.orders' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.gross' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.returned' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.cancelled' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.price' | translate }}</th>
                  <th scope="col">{{ 'admin.reports.products.stock' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of rows(); track p.variant_id) {
                  <tr>
                    <th scope="row">
                      <bdi>{{ name(p) }}</bdi>
                      <span class="rep-sub"><bdi dir="ltr">{{ p.sku }}</bdi></span>
                      @if (p.archived) {
                        <span class="rep-tag">{{ 'admin.reports.products.archived' | translate }}</span>
                      }
                    </th>
                    <td [attr.data-label]="'admin.reports.products.units' | translate" class="rep-num"><strong>{{ count(p.units_ordered) }}</strong></td>
                    <td [attr.data-label]="'admin.reports.products.orders' | translate" class="rep-num">{{ count(p.orders_count) }}</td>
                    <td [attr.data-label]="'admin.reports.products.gross' | translate" class="rep-num">{{ money(p.gross_value_piastres) }}</td>
                    <td [attr.data-label]="'admin.reports.products.returned' | translate" class="rep-num">{{ count(p.returned_units) }}</td>
                    <td [attr.data-label]="'admin.reports.products.cancelled' | translate" class="rep-num">{{ count(p.cancelled_units) }}</td>
                    <td [attr.data-label]="'admin.reports.products.price' | translate" class="rep-num rep-current">
                      {{ p.current_price_piastres === null ? ('admin.reports.products.noPrice' | translate) : money(p.current_price_piastres) }}
                    </td>
                    <td [attr.data-label]="'admin.reports.products.stock' | translate" class="rep-num rep-current">{{ count(p.current_stock) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      }
    </section>
  `,
})
export class AdminProductsReport {
  private readonly reports = inject(AdminReportsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly exporter = viewChild(AdminReportExport);

  protected readonly rows = signal<ProductReportRow[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private request: Subscription | null = null;

  protected readonly exportRun = (format: ExportFormat) => this.reports.export('products', this.reports.period(), this.language.currentLanguage(), undefined, format);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    effect(() => {
      const period = this.reports.period();
      untracked(() => this.load(period));
    });
  }

  protected load(period: ReportPeriod = this.reports.period()): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.exporter()?.reset();
    this.request = this.reports.products(period).subscribe({
      next: (rows) => {
        this.rows.set(rows);
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

  protected name(row: ProductReportRow): string {
    return this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar;
  }

  protected money(piastres: number): string {
    return egp(piastres, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return count(value, this.language.currentLanguage());
  }
}
