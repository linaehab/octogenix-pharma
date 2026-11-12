import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { Money } from '../../jovie/data/jovie-product.models';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminNoteDialog } from '../components/admin-note-dialog';
import { AdminState } from '../components/admin-state';
import { adminProductsTranslations } from '../products/admin-products-translations';
import { apiErrorMessages } from '../products/api-errors';
import { OrderListPage, OrderListQuery, OrderListRow, OrderListTab, OrderStatus } from './admin-orders.models';
import { AdminOrdersService } from './admin-orders.service';
import { adminOrdersTranslations } from './admin-orders-translations';

const EMPTY: OrderListQuery = { tab: '', search: '', status: '', payment_status: '', payment_method: '', governorate_id: '', from: '', to: '', page: 1 };
/** The stages in workflow order: New (cash on delivery, or card awaiting payment), Confirmed, Preparing, Prepared, Delivered, then the final ones. */
export const ORDER_STATUSES = ['pending_confirmation', 'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'expired'];

/**
 * /admin/orders — every order, newest first, filtered and paged by the API. Status tabs group the
 * real statuses (the API defines the groups and counts them); each row offers the normal next step
 * and an "Other actions" menu, both given by the API for this admin.
 */
@Component({
  selector: 'app-admin-orders-list-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminConfirmDialog, AdminNoteDialog],
  templateUrl: './admin-orders-list-page.html',
  styleUrl: './admin-orders-list-page.css',
})
export class AdminOrdersListPage {
  private readonly api = inject(AdminOrdersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly confirmDialog = viewChild.required(AdminConfirmDialog);
  private readonly noteDialog = viewChild.required(AdminNoteDialog);

  protected readonly query = signal<OrderListQuery>({ ...EMPTY });
  protected readonly rows = signal<OrderListRow[]>([]);
  protected readonly meta = signal<OrderListPage['meta'] | null>(null);
  protected readonly governorates = signal<OrderListPage['options']['governorates']>([]);
  protected readonly tabs = signal<OrderListTab[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private request: Subscription | null = null;
  private exportRequest: Subscription | null = null;
  /** Exporting needs orders.view and the dedicated orders.export (the API checks the same). */
  protected readonly canExport = computed(() => this.auth.can({ permissions: ['orders.view', 'orders.export'] }));
  /** Only decides whether the actions column is shown; each row's actions come from the API. */
  protected readonly canManage = computed(() => this.auth.can({ permissions: ['orders.manage'] }));
  protected readonly exporting = signal(false);
  protected readonly exported = signal<string | null>(null);
  /** Why the last export did not download (a translation key), or null. */
  protected readonly exportFailed = signal<string | null>(null);

  /** The order whose action is running (one at a time), and the row whose "Other actions" menu is open. */
  protected readonly acting = signal<string | null>(null);
  protected readonly menuFor = signal<number | null>(null);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);

  protected readonly activeTab = computed(() => this.query().tab || 'all');
  /** The stage filter offers only the statuses of the open tab. */
  protected readonly statuses = computed(() => {
    const tab = this.tabs().find((t) => t.key === this.activeTab());
    return tab && tab.statuses.length ? tab.statuses : ORDER_STATUSES;
  });

  protected readonly filtered = computed(() => Object.entries(this.query()).some(([key, value]) => key !== 'page' && value !== ''));

  constructor() {
    this.language.addTranslations(adminProductsTranslations);
    this.language.addTranslations(adminOrdersTranslations);
    inject(DestroyRef).onDestroy(() => {
      this.request?.unsubscribe();
      this.exportRequest?.unsubscribe();
    });
    this.load();
  }

  /** Every order matching the applied filters, as an Excel file (one download at a time). */
  protected exportExcel(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.exported.set(null);
    this.exportFailed.set(null);
    this.exportRequest = this.api.export(this.query(), this.language.currentLanguage()).subscribe({
      next: (name) => {
        this.exporting.set(false);
        this.exported.set(name);
      },
      error: (error: unknown) => {
        this.exporting.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        // 422: no order matches any more (for example changed meanwhile), so there was nothing to export.
        this.exportFailed.set(error instanceof HttpErrorResponse && error.status === 422 ? 'admin.orders.exportNone' : 'admin.orders.exportFailed');
      },
    });
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.exported.set(null);
    this.exportFailed.set(null);
    this.loading.set(true);
    this.error.set(false);
    this.request = this.api.list(this.query()).subscribe({
      next: (page) => {
        // After an action the last page may have emptied: show the new last page instead.
        if (!page.data.length && this.query().page > 1 && page.meta.last_page < this.query().page) {
          this.query.update((q) => ({ ...q, page: Math.max(1, page.meta.last_page) }));
          this.load();
          return;
        }
        this.rows.set(page.data);
        this.meta.set(page.meta);
        this.governorates.set(page.options.governorates);
        this.tabs.set(page.options.tabs ?? []);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        this.error.set(true);
      },
    });
  }

  protected apply(form: HTMLFormElement): void {
    const value = (name: string) => ((form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null)?.value ?? '').trim();
    this.notice.set(null);
    this.query.set({
      tab: this.query().tab,
      search: value('search'),
      status: value('status'),
      payment_status: value('payment_status'),
      payment_method: value('payment_method'),
      governorate_id: value('governorate_id'),
      from: value('from'),
      to: value('to'),
      page: 1,
    });
    this.load();
  }

  /** Another tab keeps the other filters (dates, search, payment…); only the stage filter resets. */
  protected selectTab(key: string): void {
    if (key === this.activeTab()) {
      return;
    }
    this.notice.set(null);
    this.menuFor.set(null);
    this.query.update((q) => ({ ...q, tab: key === 'all' ? '' : key, status: '', page: 1 }));
    this.load();
  }

  protected clear(form: HTMLFormElement): void {
    form.reset();
    this.notice.set(null);
    this.query.set({ ...EMPTY });
    this.load();
  }

  protected goTo(page: number): void {
    this.menuFor.set(null);
    this.query.update((q) => ({ ...q, page }));
    this.load();
  }

  protected toggleMenu(id: number): void {
    this.menuFor.update((open) => (open === id ? null : id));
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeMenu(): void {
    this.menuFor.set(null);
  }

  protected actionLabel(status: OrderStatus): string {
    return this.language.translate(`admin.orders.action.${status}`);
  }

  /** Cancel and Return keep their names; any other move is a stage correction. */
  protected otherLabel(status: OrderStatus): string {
    return status === 'cancelled' || status === 'returned'
      ? this.actionLabel(status)
      : this.language.translate('admin.orders.moveTo', { status: this.language.translate(`admin.orders.statusName.${status}`) });
  }

  /** The normal next step: a simple confirmation, then the existing status endpoint. */
  protected async quick(row: OrderListRow): Promise<void> {
    const to = row.actions?.next;
    if (!to || this.acting()) {
      return;
    }
    const ok = await this.confirmDialog().ask({
      title: `admin.orders.confirm.${to}.title`,
      message: `admin.orders.confirm.${to}.text`,
      confirm: `admin.orders.action.${to}`,
      params: { number: row.order_number },
    });
    if (ok) {
      this.change(row, to, null);
    }
  }

  /** Cancel, return or correct: always with a required note, sent to the API and kept in the history. */
  protected async other(row: OrderListRow, to: OrderStatus): Promise<void> {
    this.menuFor.set(null);
    if (this.acting() || !row.actions?.other.includes(to)) {
      return;
    }
    const special = to === 'cancelled' || to === 'returned';
    const status = this.language.translate(`admin.orders.statusName.${to}`);
    const note = await this.noteDialog().ask({
      title: special ? `admin.orders.confirm.${to}.title` : 'admin.orders.confirm.correction.title',
      message: special ? `admin.orders.confirm.${to}.text` : 'admin.orders.confirm.correction.text',
      confirm: special ? `admin.orders.action.${to}` : 'admin.orders.correctGo',
      params: {
        number: row.order_number,
        count: this.count(row.items_count),
        status,
        from: this.language.translate(`admin.orders.statusName.${row.status}`),
      },
      noteLabel: 'admin.orders.reason',
      noteRequired: true,
      noteHelp: 'admin.orders.correctionNoteHelp',
      tone: 'danger',
    });
    if (note !== null) {
      this.change(row, to, note);
    }
  }

  private change(row: OrderListRow, to: OrderStatus, note: string | null): void {
    this.acting.set(row.order_number);
    this.notice.set(null);
    this.api.setStatus(row.order_number, to, note, row.status).subscribe({
      next: () => {
        this.acting.set(null);
        this.notice.set({
          kind: 'success',
          text: this.language.translate('admin.orders.done.statusFor', { number: row.order_number, status: this.language.translate(`admin.orders.statusName.${to}`) }),
        });
        // Same filters, tab and page: the row and the tab counts come back from the API.
        this.load();
      },
      error: (error: unknown) => {
        this.acting.set(null);
        if (this.sessionEnded(error)) {
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.notice.set({ kind: 'error', text: this.language.translate('admin.orders.changedMeanwhileRow', { number: row.order_number }) });
          this.load();
          return;
        }
        this.notice.set({ kind: 'error', text: this.language.translate('admin.orders.actionFailed'), details: apiErrorMessages(error) });
      },
    });
  }

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
      void this.router.navigateByUrl('/admin/login');
      return true;
    }
    return false;
  }

  protected money(value: Money): string {
    return formatPrice(value, this.language.currentLanguage());
  }

  protected place(row: { en: string; ar: string }): string {
    return this.language.currentLanguage() === 'ar' ? row.ar || row.en : row.en || row.ar;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.locale()).format(value);
  }

  protected date(value: string | null): string {
    return value
      ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value))
      : '—';
  }

  private locale(): string {
    return this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB';
  }
}
