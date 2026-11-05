import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CheckoutService } from '../../store/checkout.service';
import { OrderDetails } from '../../store/order-details';
import { Order } from '../../store/store.models';
import { AccountApiService } from '../account-api.service';
import { AccountShell } from '../account-shell';
import { failureKey } from '../account-forms';

/**
 * /jovie/account/orders/:orderNumber — one of the customer's orders as the server recorded it, with
 * cancelling (while the server allows it) and paying an unpaid card order.
 */
@Component({
  selector: 'app-order-page',
  imports: [RouterLink, TranslatePipe, AccountShell, OrderDetails],
  template: `
    <app-account-shell [title]="'account.nav.orders' | translate">
      <p><a class="jv-link" routerLink="/jovie/account/orders">{{ 'account.orders.back' | translate }}</a></p>
      @switch (state()) {
        @case ('loading') {
          <p role="status">{{ 'jovie.cart.loading' | translate }}</p>
        }
        @case ('missing') {
          <div class="jv-notice is-error" role="alert"><p>{{ 'account.orders.missing' | translate }}</p></div>
        }
        @case ('error') {
          <div class="jv-notice is-error" role="alert"><p>{{ 'account.error.server' | translate }}</p></div>
        }
        @default {
          @let o = order()!;
          <section class="account-card summary">
            <p>{{ 'jovie.order.number' | translate }}: <strong dir="ltr">{{ o.order_number }}</strong></p>
            <p>{{ 'account.orders.placed' | translate }}: {{ date(o.placed_at) }}</p>
            <p>{{ 'account.orders.status' | translate }}: <strong>{{ ('account.status.' + o.status) | translate }}</strong></p>
            <p>{{ 'account.orders.payment' | translate }}: {{ ('jovie.checkout.method.' + o.payment_method) | translate }} ·
              {{ ('account.payment.' + o.payment_status) | translate }}</p>
            <p class="jv-notice is-error" role="alert" [hidden]="!actionError()">{{ actionError() ?? '' | translate }}</p>
            <div class="actions">
              @if (o.status === 'pending_payment' && o.payment_method === 'card') {
                <button type="button" class="jv-button" [disabled]="busy()" (click)="pay(o)">{{ 'account.orders.pay' | translate }}</button>
              }
              @if (o.can_cancel) {
                @if (confirming()) {
                  <span>{{ 'account.orders.cancelConfirm' | translate }}</span>
                  <button type="button" class="jv-button jv-button--night" [disabled]="busy()" (click)="cancel(o)">{{ 'account.orders.cancelYes' | translate }}</button>
                  <button type="button" class="jv-button jv-button--light" (click)="confirming.set(false)">{{ 'account.cancel' | translate }}</button>
                } @else {
                  <button type="button" class="jv-button jv-button--light" (click)="confirming.set(true)">{{ 'account.orders.cancel' | translate }}</button>
                }
              }
            </div>
          </section>
          <app-order-details [order]="o" />
        }
      }
    </app-account-shell>
  `,
  styles: `
    .summary p {
      margin: 0 0 0.5rem;
    }

    .actions {
      align-items: center;
    }
  `,
})
export class OrderPage {
  private readonly api = inject(AccountApiService);
  private readonly checkout = inject(CheckoutService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly number = inject(ActivatedRoute).snapshot.paramMap.get('orderNumber') ?? '';

  protected readonly order = signal<Order | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'missing' | 'error'>('loading');
  protected readonly busy = signal(false);
  protected readonly confirming = signal(false);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    this.api.order(this.number).subscribe({
      next: (order) => {
        this.order.set(order);
        this.state.set('ready');
      },
      error: (error: unknown) =>
        this.state.set(error instanceof HttpErrorResponse && error.status === 404 ? 'missing' : 'error'),
    });
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  protected cancel(order: Order): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.api.cancelOrder(order.order_number).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.confirming.set(false);
        this.order.set(updated);
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.actionError.set(error instanceof HttpErrorResponse && error.status === 422 ? 'account.orders.cannotCancel' : failureKey(error));
      },
    });
  }

  /** Card orders not paid yet: the payment page again (in TEST MODE the store's mock page). */
  protected pay(order: Order): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.checkout.startCardPayment(order.order_number).subscribe({
      next: ({ redirect_url }) => {
        const target = new URL(redirect_url, window.location.origin);
        if (target.origin === window.location.origin) {
          this.router.navigateByUrl(target.pathname + target.search);
        } else {
          window.location.assign(target.href);
        }
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.actionError.set(failureKey(error));
      },
    });
  }
}
