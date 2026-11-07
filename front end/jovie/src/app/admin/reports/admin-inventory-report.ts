import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';
import { AdminReportExport } from './admin-report-export';
import { InventoryReport, InventoryReportRow, ReportPeriod } from './admin-reports.models';
import { AdminReportsService } from './admin-reports.service';
import { count } from './report-format';

/** /admin/reports/inventory — current stock and the period's stock movements (read-only; changes nothing). */
@Component({
  selector: 'app-admin-inventory-report',
  imports: [TranslatePipe, AdminState, AdminStatCard, AdminReportExport],
  template: `
    <div class="rep-toolbar">
      <p class="rep-definitions">{{ 'admin.reports.inventory.lead' | translate }}</p>
      <app-admin-report-export [run]="exportRun" [disabled]="state() !== 'ready' || !report()?.rows?.length" (sessionEnded)="endSession()" />
    </div>
    @switch (state()) {
      @case ('loading') {
        <section class="adm-panel"><app-admin-state kind="loading" /></section>
      }
      @case ('error') {
        <section class="adm-panel"><app-admin-state kind="error" (retry)="load()" /></section>
      }
      @default {
        @if (report(); as r) {
          @if (!r.rows.length) {
            <section class="adm-panel"><app-admin-state kind="empty" message="admin.reports.inventory.none" /></section>
          } @else {
            <section class="adm-panel" aria-labelledby="rep-inv-figures">
              <h2 id="rep-inv-figures" class="adm-visually-hidden">{{ 'admin.reports.tab.inventory' | translate }}</h2>
              <div class="adm-grid rep-cards">
                <app-admin-stat-card [label]="'admin.reports.inventory.tracked' | translate" [value]="count(r.summary.tracked)" />
                <app-admin-stat-card [label]="'admin.reports.inventory.low' | translate" [value]="count(r.summary.low_stock)" [tone]="r.summary.low_stock ? 'attention' : 'default'" />
                <app-admin-stat-card [label]="'admin.reports.inventory.out' | translate" [value]="count(r.summary.out_of_stock)" [tone]="r.summary.out_of_stock ? 'attention' : 'default'" />
                <app-admin-stat-card [label]="'admin.reports.inventory.increase' | translate" [value]="count(r.summary.increase)" />
                <app-admin-stat-card [label]="'admin.reports.inventory.decrease' | translate" [value]="count(r.summary.decrease)" />
              </div>
            </section>

            <section class="adm-panel rep-panel" aria-labelledby="rep-inv-stock">
              <h2 id="rep-inv-stock">{{ 'admin.reports.inventory.current' | translate }}</h2>
              <table class="rep-table rep-cards-narrow">
                <thead>
                  <tr>
                    <th scope="col">{{ 'admin.reports.inventory.product' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.current' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.status' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.opening' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.increase' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.decrease' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.closing' | translate }}</th>
                    <th scope="col">{{ 'admin.reports.inventory.movements' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of r.rows; track row.variant_id) {
                    <tr>
                      <th scope="row"><bdi>{{ name(row) }}</bdi> <span class="rep-sub"><bdi dir="ltr">{{ row.sku }}</bdi></span></th>
                      <td [attr.data-label]="'admin.reports.inventory.current' | translate" class="rep-num"><strong>{{ count(row.current_stock) }}</strong></td>
                      <td [attr.data-label]="'admin.reports.inventory.status' | translate">
                        <span class="rep-stock" [attr.data-status]="row.stock_status">{{ 'admin.reports.inventory.statusName.' + row.stock_status | translate }}</span>
                      </td>
                      @if (row.history_complete) {
                        <td [attr.data-label]="'admin.reports.inventory.opening' | translate" class="rep-num">{{ count(row.opening_stock ?? 0) }}</td>
                      } @else {
                        <td [attr.data-label]="'admin.reports.inventory.opening' | translate" class="rep-incomplete">
                          <span [title]="'admin.reports.inventory.incompleteNote' | translate">{{ 'admin.reports.inventory.incomplete' | translate }}</span>
                        </td>
                      }
                      <td [attr.data-label]="'admin.reports.inventory.increase' | translate" class="rep-num">+{{ count(row.increase) }}</td>
                      <td [attr.data-label]="'admin.reports.inventory.decrease' | translate" class="rep-num">−{{ count(row.decrease) }}</td>
                      <td [attr.data-label]="'admin.reports.inventory.closing' | translate" class="rep-num">
                        {{ row.history_complete ? count(row.closing_stock ?? 0) : ('admin.reports.notAvailable' | translate) }}
                      </td>
                      <td [attr.data-label]="'admin.reports.inventory.movements' | translate" class="rep-num">{{ count(row.movements) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (anyIncomplete()) {
                <p class="adm-panel-lead rep-foot">{{ 'admin.reports.inventory.incompleteNote' | translate }}</p>
              }
            </section>

            <section class="adm-panel rep-panel" aria-labelledby="rep-inv-reasons">
              <h2 id="rep-inv-reasons">{{ 'admin.reports.inventory.reasons' | translate }}</h2>
              @if (!reasons().length) {
                <app-admin-state kind="empty" message="admin.reports.inventory.noMovements" />
              } @else {
                <table class="rep-table">
                  <thead>
                    <tr>
                      <th scope="col">{{ 'admin.reports.inventory.reason' | translate }}</th>
                      <th scope="col">{{ 'admin.reports.inventory.increase' | translate }}</th>
                      <th scope="col">{{ 'admin.reports.inventory.decrease' | translate }}</th>
                      <th scope="col">{{ 'admin.reports.inventory.movements' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (reason of reasons(); track reason.key) {
                      <tr>
                        <th scope="row">{{ 'admin.reports.inventory.reasonName.' + reason.key | translate }}</th>
                        <td [attr.data-label]="'admin.reports.inventory.increase' | translate" class="rep-num">+{{ count(reason.increase) }}</td>
                        <td [attr.data-label]="'admin.reports.inventory.decrease' | translate" class="rep-num">−{{ count(reason.decrease) }}</td>
                        <td [attr.data-label]="'admin.reports.inventory.movements' | translate" class="rep-num">{{ count(reason.count) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </section>
          }
        }
      }
    }
  `,
})
export class AdminInventoryReport {
  private readonly reports = inject(AdminReportsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly exporter = viewChild(AdminReportExport);

  protected readonly report = signal<InventoryReport | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  private request: Subscription | null = null;

  protected readonly reasons = computed(() =>
    Object.entries(this.report()?.reasons ?? {})
      .filter(([, r]) => r.count > 0)
      .map(([key, r]) => ({ key, ...r })),
  );
  protected readonly anyIncomplete = computed(() => (this.report()?.rows ?? []).some((r) => !r.history_complete));

  protected readonly exportRun = () => this.reports.export('inventory', this.reports.period(), this.language.currentLanguage());

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
    this.request = this.reports.inventory(period).subscribe({
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

  protected name(row: InventoryReportRow): string {
    return this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar;
  }

  protected count(value: number): string {
    return count(value, this.language.currentLanguage());
  }
}
