import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CheckoutService } from '../../store/checkout.service';
import { OrderDetails } from '../../store/order-details';
import { Order } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';
import { TestModeNotice } from '../../store/test-mode-notice';

type Outcome = 'checking' | 'paid' | 'unpaid' | 'closed' | 'noAccess' | 'error';

/**
 * /jovie/checkout/payment-result?order=… — where the payment page sends the customer back
 * (config payments.return_url). It never trusts the redirect: it asks the server, which checks
 * the attempt with the provider (POST /orders/{number}/payment-status), and shows that result.
 */
@Component({
  selector: 'app-jovie-payment-result-page',
  imports: [RouterLink, TranslatePipe, StorePageHeader, TestModeNotice, OrderDetails],
  template: `
    <app-store-page-header [title]="('jovie.result.' + outcome() + 'Title') | translate" />
    <section class="jv-container page" aria-live="polite">
      <app-test-mode-notice class="test" [payment]="true" />

      <div class="panel" [attr.data-outcome]="outcome()">
        @if (orderNumber()) {
          <p class="number">{{ 'jovie.order.number' | translate }}: <strong dir="ltr">{{ orderNumber() }}</strong></p>
        }
        <p>{{ ('jovie.result.' + outcome() + 'Text') | translate }}</p>

        <div class="buttons">
          @switch (outcome()) {
            @case ('unpaid') {
              <button class="jv-button" type="button" [disabled]="busy()" (click)="payAgain()">{{ 'jovie.result.tryAgain' | translate }}</button>
              <button class="jv-button jv-button--light" type="button" [disabled]="busy()" (click)="check()">{{ 'jovie.result.checkAgain' | translate }}</button>
            }
            @case ('error') {
              <button class="jv-button" type="button" (click)="check()">{{ 'jovie.result.checkAgain' | translate }}</button>
            }
          }
          <a class="jv-button jv-button--night" routerLink="/jovie/shop">{{ 'jovie.cart.continue' | translate }}</a>
        </div>
      </div>

      @if (order(); as o) {
        <app-order-details [order]="o" />
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      display: grid;
      gap: 1.5rem;
      padding-block: 1.5rem clamp(3.5rem, 8vw, 6rem);
    }

    .panel {
      padding: clamp(1.25rem, 3vw, 2rem);
      border-inline-start: 6px solid var(--jv-sunshine);
      border-radius: 12px;
      background: var(--jv-panel);
    }

    .panel[data-outcome='paid'] {
      border-color: #11795f;
    }

    .panel[data-outcome='unpaid'],
    .panel[data-outcome='closed'],
    .panel[data-outcome='error'],
    .panel[data-outcome='noAccess'] {
      border-color: var(--jv-sweetypie);
    }

    .number {
      margin-top: 0;
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1.25rem;
    }
  `,
})
export class JoviePaymentResultPage {
  private readonly checkout = inject(CheckoutService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly orderNumber = computed(() => this.params()?.get('order') ?? '');

  protected readonly order = signal<Order | null>(null);
  protected readonly outcome = signal<Outcome>('checking');
  protected readonly busy = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.check();
    }
  }

  protected check(): void {
    const number = this.orderNumber();
    if (!number || !this.checkout.hasToken(number)) {
      this.outcome.set('noAccess');
      return;
    }
    this.outcome.set('checking');
    this.checkout.paymentStatus(number).subscribe({
      next: (order) => {
        this.order.set(order);
        this.outcome.set(
          order.payment_status === 'paid'
            ? 'paid'
            : order.status === 'pending_payment'
              ? 'unpaid'
              : ['cancelled', 'expired'].includes(order.status)
                ? 'closed'
                : 'unpaid',
        );
      },
      error: () => this.outcome.set('error'),
    });
  }

  protected payAgain(): void {
    this.busy.set(true);
    this.checkout.startCardPayment(this.orderNumber()).subscribe({
      next: ({ redirect_url }) => {
        const target = new URL(redirect_url, window.location.origin);
        if (target.pathname === '/jovie/checkout/mock-payment') {
          this.router.navigateByUrl(target.pathname + target.search);
        } else {
          window.location.assign(target.href);
        }
      },
      error: () => {
        this.busy.set(false);
        this.check();
      },
    });
  }
}
