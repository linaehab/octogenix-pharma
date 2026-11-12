import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { Money } from '../../jovie/data/jovie-product.models';
import { AdminAuthService } from '../admin-auth.service';
import { AdminNoteDialog } from '../components/admin-note-dialog';
import { AdminState } from '../components/admin-state';
import { apiErrorMessages } from '../products/api-errors';
import { AdminOrder, OrderStatus } from './admin-orders.models';
import { AdminOrdersService } from './admin-orders.service';
import { adminOrdersTranslations } from './admin-orders-translations';

/** One line of the order timeline, built only from what the API recorded. */
interface TimelineEvent {
  at: string;
  label: string;
  params: Record<string, string | number>;
  who: string | null;
  note: string | null;
  internal: boolean;
  kind: 'status' | 'payment' | 'stock';
}

/**
 * /admin/orders/:number — one order: information, customer and address, the items as ordered
 * (snapshots), money, payments, timeline, and the actions the API allows this admin right now.
 */
@Component({
  selector: 'app-admin-order-page',
  imports: [RouterLink, TranslatePipe, AdminState, AdminNoteDialog],
  templateUrl: './admin-order-page.html',
  styleUrls: ['./admin-order-page.css', './admin-order-side.css'],
})
export class AdminOrderPage {
  private readonly api = inject(AdminOrdersService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required(AdminNoteDialog);
  private readonly number = inject(ActivatedRoute).snapshot.paramMap.get('number') ?? '';

  protected readonly order = signal<AdminOrder | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'error' | 'notFound'>('loading');
  protected readonly busy = signal(false);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);

  protected readonly timeline = computed<TimelineEvent[]>(() => {
    const order = this.order();
    if (!order) {
      return [];
    }
    const events: (TimelineEvent & { order: number })[] = [];
    order.history.forEach((h, i) => {
      const placed = h.field === 'status' && h.from === null;
      const payment = h.field === 'payment_status';
      events.push({
        order: i,
        at: h.at,
        kind: payment ? 'payment' : 'status',
        label: placed
          ? 'admin.orders.event.placed'
          : payment
            ? 'admin.orders.event.payment'
            : h.from
              ? 'admin.orders.event.statusChange'
              : 'admin.orders.event.status',
        params: {
          status: this.language.translate(`admin.orders.${payment ? 'paymentName' : 'statusName'}.${h.to}`),
          from: h.from ? this.language.translate(`admin.orders.${payment ? 'paymentName' : 'statusName'}.${h.from}`) : '',
        },
        who: h.admin?.name ?? this.language.translate(`admin.orders.actor.${h.actor}`),
        note: h.note,
        internal: !h.customer_visible,
      });
    });
    order.stock_movements.forEach((m, i) => {
      events.push({
        order: 1000 + i,
        at: m.at,
        kind: 'stock',
        label: `admin.orders.event.${m.reason}`,
        params: { count: this.count(Math.abs(m.quantity_change)), sku: m.sku ?? '' },
        who: m.admin?.name ?? null,
        note: null,
        internal: true,
      });
    });
    return events.sort((a, b) => a.at.localeCompare(b.at) || a.order - b.order);
  });

  /**
   * Stages offered as corrections (not the normal next step): the API requires a note for them.
   * Cancel and Return keep their own buttons even when they need a note.
   */
  protected readonly corrections = computed<OrderStatus[]>(() => {
    const a = this.order()?.actions;
    return a ? a.statuses.filter((s) => a.reason_required.includes(s) && s !== 'cancelled' && s !== 'returned') : [];
  });

  /** The normal next step(s), plus Cancel and Return when allowed. */
  protected readonly nextSteps = computed<OrderStatus[]>(() => {
    const corrections = this.corrections();
    return (this.order()?.actions?.statuses ?? []).filter((s) => !corrections.includes(s));
  });

  /** When the stage last changed (the newest status line of the history). */
  protected readonly lastStatusAt = computed(() => {
    const history = this.order()?.history.filter((h) => h.field === 'status') ?? [];
    return history.length ? history.reduce((a, b) => (b.at >= a.at ? b : a)).at : null;
  });

  protected readonly correctionTarget = signal<OrderStatus | ''>('');

  /** Units the order holds in stock, for the cancellation message. */
  protected readonly units = computed(() => this.order()?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0);

  constructor() {
    this.language.addTranslations(adminOrdersTranslations);
    this.load();
  }

  protected load(): void {
    this.state.set(this.order() ? 'ready' : 'loading');
    this.api.get(this.number).subscribe({
      next: (order) => {
        this.order.set(order);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (this.sessionEnded(error)) {
          return;
        }
        this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error');
      },
    });
  }

  protected async changeStatus(to: OrderStatus): Promise<void> {
    const order = this.order();
    if (!order || this.busy()) {
      return;
    }
    const required = order.actions?.reason_required.includes(to) ?? false;
    const correction = this.corrections().includes(to);
    const status = this.language.translate(`admin.orders.statusName.${to}`);
    const note = await this.dialog().ask({
      title: correction ? 'admin.orders.confirm.correction.title' : `admin.orders.confirm.${to}.title`,
      message: correction ? 'admin.orders.confirm.correction.text' : `admin.orders.confirm.${to}.text`,
      confirm: correction ? 'admin.orders.correctGo' : `admin.orders.action.${to}`,
      params: { number: order.order_number, count: this.count(this.units()), status, from: this.language.translate(`admin.orders.statusName.${order.status}`) },
      noteLabel: required ? 'admin.orders.reason' : 'admin.orders.noteOptional',
      noteRequired: required,
      noteHelp: required ? (correction ? 'admin.orders.correctionNoteHelp' : 'admin.orders.reasonHelp') : 'admin.orders.noteHelp',
      tone: to === 'cancelled' || to === 'returned' || correction ? 'danger' : 'default',
    });
    if (note === null) {
      return;
    }
    this.correctionTarget.set('');
    this.run(this.api.setStatus(order.order_number, to, note || null, order.status), 'admin.orders.done.status', { status });
  }

  protected pickCorrection(value: string): void {
    this.correctionTarget.set(this.corrections().includes(value as OrderStatus) ? (value as OrderStatus) : '');
  }

  protected async collectCod(): Promise<void> {
    const order = this.order();
    if (!order || this.busy()) {
      return;
    }
    const note = await this.dialog().ask({
      title: 'admin.orders.confirm.cod.title',
      message: 'admin.orders.confirm.cod.text',
      confirm: 'admin.orders.action.cod',
      params: { amount: this.money(order.totals.total), number: order.order_number },
      noteLabel: 'admin.orders.noteOptional',
      noteHelp: 'admin.orders.codNoteHelp',
    });
    if (note === null) {
      return;
    }
    this.run(this.api.collectCod(order.order_number, note || null, order.payment_status), 'admin.orders.done.cod', {});
  }

  protected async restock(): Promise<void> {
    const order = this.order();
    if (!order || this.busy()) {
      return;
    }
    const note = await this.dialog().ask({
      title: 'admin.orders.confirm.restock.title',
      message: 'admin.orders.confirm.restock.text',
      confirm: 'admin.orders.action.restock',
      params: { count: this.count(this.units()) },
      noteLabel: 'admin.orders.reason',
      noteRequired: true,
      noteHelp: 'admin.orders.restockHelp',
    });
    if (note === null) {
      return;
    }
    this.run(this.api.restockReturned(order.order_number, note), 'admin.orders.done.restock', {}, true);
  }

  protected saveNote(text: string): void {
    const order = this.order();
    if (!order || this.busy()) {
      return;
    }
    this.run(this.api.saveNote(order.order_number, text.trim() || null), 'admin.orders.done.note', {});
  }

  /** Runs one action; while it runs no other action can start (no double submission). */
  private run(action: Observable<unknown>, successKey: string, params: Record<string, string>, reload = false): void {
    this.busy.set(true);
    this.notice.set(null);
    action.subscribe({
      next: (result) => {
        this.busy.set(false);
        this.notice.set({ kind: 'success', text: this.language.translate(successKey, params) });
        if (!reload && result && typeof result === 'object' && 'order_number' in result) {
          this.order.set(result as AdminOrder);
        } else {
          this.load();
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        if (this.sessionEnded(error)) {
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          // Someone else (or the system) changed the order: show its current state.
          this.notice.set({ kind: 'error', text: this.language.translate('admin.orders.changedMeanwhile') });
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

  protected pick(text: { en: string | null; ar: string | null } | null | undefined): string {
    if (!text) {
      return '';
    }
    return (this.language.currentLanguage() === 'ar' ? text.ar || text.en : text.en || text.ar) ?? '';
  }

  /** A line before the promo code (unit price × quantity); the money section shows the promo. */
  protected lineAmount(unit: Money, quantity: number): Money {
    return { ...unit, amount_piastres: unit.amount_piastres * quantity };
  }

  protected money(value: Money): string {
    return formatPrice(value, this.language.currentLanguage());
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
