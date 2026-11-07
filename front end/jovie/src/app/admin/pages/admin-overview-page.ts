import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminAuthService } from '../admin-auth.service';
import { AdminDashboardService, DashboardPeriod, DashboardSummary } from '../admin-dashboard.service';
import { AdminStatCard } from '../components/admin-stat-card';
import { AdminState } from '../components/admin-state';

/**
 * /admin — overview. Only real figures from GET /admin/dashboard/summary; the API leaves out the
 * blocks the admin may not see, and so does this page. Paid revenue and delivered value stay apart.
 */
@Component({
  selector: 'app-admin-overview-page',
  imports: [TranslatePipe, AdminStatCard, AdminState],
  template: `
    <div class="adm-page-head">
      <div>
        <h1>{{ 'admin.overview.title' | translate }}</h1>
        @if (auth.admin(); as a) {
          <p>{{ 'admin.overview.welcome' | translate: { name: a.name } }}</p>
        }
      </div>
      <div class="adm-refresh">
        @if (updatedAt(); as time) {
          <p>{{ 'admin.overview.updated' | translate: { time: time } }}</p>
        }
        <button type="button" class="adm-button is-light" [disabled]="loading()" [attr.aria-busy]="loading()" (click)="load()">
          @if (loading()) {
            <span class="adm-spinner" aria-hidden="true"></span>
          }
          {{ 'admin.overview.refresh' | translate }}
        </button>
      </div>
    </div>

    @if (summary(); as s) {
      @if (error()) {
        <div class="adm-gap"><app-admin-state kind="error" message="admin.overview.refreshFailed" (retry)="load()" /></div>
      }
      @if (s.test_mode) {
        <p class="adm-banner" role="note">{{ 'admin.overview.testMode' | translate }}</p>
      }

      @if (s.reviews || s.messages || s.inventory) {
        <section class="adm-panel" aria-labelledby="adm-attention">
          <h2 id="adm-attention">{{ 'admin.overview.attention' | translate }}</h2>
          <div class="adm-grid">
            @if (s.reviews; as r) {
              <app-admin-stat-card [label]="'admin.overview.pendingReviews' | translate" [value]="count(r.pending)"
                [tone]="r.pending > 0 ? 'attention' : 'calm'" [note]="'admin.overview.pendingReviewsNote' | translate" />
            }
            @if (s.messages; as m) {
              <app-admin-stat-card [label]="'admin.overview.newMessages' | translate" [value]="count(m.new)"
                [tone]="m.new > 0 ? 'attention' : 'calm'" [note]="'admin.overview.newMessagesNote' | translate" />
            }
            @if (s.inventory; as i) {
              <app-admin-stat-card [label]="'admin.overview.lowStock' | translate" [value]="count(i.low_stock)"
                [tone]="i.low_stock + i.out_of_stock > 0 ? 'attention' : 'calm'"
                [note]="'admin.overview.outOfStock' | translate: { count: count(i.out_of_stock) }">
                @if (i.without_threshold > 0) {
                  <p class="adm-stat-flag">{{ 'admin.overview.withoutThreshold' | translate: { count: count(i.without_threshold) } }}</p>
                }
              </app-admin-stat-card>
            }
          </div>
        </section>
      }

      @if (s.sales; as sales) {
        <section class="adm-panel" aria-labelledby="adm-paid">
          <h2 id="adm-paid">{{ 'admin.overview.paidTitle' | translate }}</h2>
          <p class="adm-panel-lead">{{ 'admin.overview.paidLead' | translate }}</p>
          <div class="adm-grid">
            @for (period of periods; track period) {
              @let p = sales.paid_revenue[period];
              <app-admin-stat-card [label]="('admin.period.' + period) | translate" [value]="money(p.amount_piastres, s.currency)"
                [note]="'admin.overview.ordersCount' | translate: { count: count(p.orders_count) }">
                @if (p.refund_review.orders_count > 0) {
                  <p class="adm-stat-flag">{{ 'admin.overview.refundReview' | translate: { amount: money(p.refund_review.amount_piastres, s.currency), count: count(p.refund_review.orders_count) } }}</p>
                }
              </app-admin-stat-card>
            }
          </div>
        </section>

        <section class="adm-panel" aria-labelledby="adm-delivered">
          <h2 id="adm-delivered">{{ 'admin.overview.deliveredTitle' | translate }}</h2>
          <p class="adm-panel-lead">{{ 'admin.overview.deliveredLead' | translate }}</p>
          <div class="adm-grid">
            @for (period of periods; track period) {
              @let d = sales.delivered_value[period];
              <app-admin-stat-card [label]="('admin.period.' + period) | translate" [value]="money(d.amount_piastres, s.currency)"
                [note]="'admin.overview.ordersCount' | translate: { count: count(d.orders_count) }">
                @if (d.not_collected.orders_count > 0) {
                  <p class="adm-stat-flag">{{ 'admin.overview.notCollected' | translate: { amount: money(d.not_collected.amount_piastres, s.currency), count: count(d.not_collected.orders_count) } }}</p>
                }
              </app-admin-stat-card>
            }
          </div>
          <ul class="adm-notes">
            <li>{{ 'admin.overview.noteTotals' | translate }}</li>
            @if (!sales.refunds_recorded) {
              <li>{{ 'admin.overview.noteRefunds' | translate }}</li>
            }
            <li>{{ 'admin.overview.noteDays' | translate }}</li>
          </ul>
        </section>
      }

      @if (s.orders; as o) {
        <section class="adm-panel" aria-labelledby="adm-orders">
          <h2 id="adm-orders">{{ 'admin.overview.ordersTitle' | translate }}</h2>
          @if (o.total === 0) {
            <app-admin-state kind="empty" message="admin.overview.noOrders" />
          } @else {
            <p class="adm-panel-lead">{{ 'admin.overview.ordersTotal' | translate: { count: count(o.total) } }}</p>
            <dl class="adm-status-list">
              @for (entry of statusEntries(); track entry.status) {
                <div [class.is-zero]="entry.count === 0">
                  <dt>{{ ('account.status.' + entry.status) | translate }}</dt>
                  <dd>{{ count(entry.count) }}</dd>
                </div>
              }
            </dl>
          }
        </section>
      }

      @if (!s.orders && !s.sales && !s.reviews && !s.messages && !s.inventory) {
        <app-admin-state kind="empty" message="admin.overview.nothing" />
      }
    } @else if (error()) {
      <app-admin-state kind="error" (retry)="load()" />
    } @else {
      <app-admin-state kind="loading" />
    }
  `,
  styles: `
    .adm-refresh {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
    }

    .adm-refresh p {
      margin: 0;
      color: var(--adm-muted);
      font-size: 0.9rem;
    }

    .adm-gap {
      margin-bottom: 1.5rem;
    }

    .adm-status-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: 0.6rem;
      margin: 0;
    }

    .adm-status-list div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      border-radius: 10px;
      background: #f3f6fb;
    }

    .adm-status-list .is-zero {
      opacity: 0.65;
    }

    .adm-status-list dd {
      margin: 0;
      color: var(--adm-navy);
      font-size: 1.15rem;
      font-weight: 700;
    }
  `,
})
export class AdminOverviewPage {
  protected readonly auth = inject(AdminAuthService);
  private readonly dashboard = inject(AdminDashboardService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly periods: readonly DashboardPeriod[] = ['today', 'last_7_days', 'last_30_days'];
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal(false);
  private request: Subscription | null = null;

  protected readonly statusEntries = computed(() =>
    Object.entries(this.summary()?.orders?.by_status ?? {}).map(([status, count]) => ({ status, count })),
  );

  protected readonly updatedAt = computed(() => {
    const generated = this.summary()?.generated_at;
    return generated
      ? new Intl.DateTimeFormat(this.locale(), { timeStyle: 'short', timeZone: this.summary()?.timezone }).format(new Date(generated))
      : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set(false);
    this.request = this.dashboard.summary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        // Session over (expired, signed out elsewhere, or the account was deactivated): back to log in.
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.auth.sessionEnded();
          void this.router.navigateByUrl('/admin/login');
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected money(piastres: number, currency: string): string {
    return formatPrice({ amount_piastres: piastres, currency }, this.language.currentLanguage());
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
