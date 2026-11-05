import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { CheckoutService } from '../../store/checkout.service';
import { CustomerAuthService } from '../../account/customer-auth.service';
import { Order } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';

/**
 * /jovie/checkout/mock-payment?order=…&ref=… — TEST MODE ONLY. Stands in for a payment
 * provider's hosted page while none is selected: it asks for no card details and only offers
 * "simulate success" / "simulate failure", which the server applies to the test attempt
 * (POST /orders/{number}/mock-payment). Outside TEST MODE the server refuses and this page says so.
 */
@Component({
  selector: 'app-jovie-mock-payment-page',
  imports: [RouterLink, TranslatePipe, StorePageHeader],
  template: `
    <app-store-page-header [title]="'jovie.mock.title' | translate" [kicker]="'jovie.test.badge' | translate" />
    <section class="jv-container page">
      <div class="panel">
        <p class="stamp">{{ 'jovie.test.badge' | translate }}</p>
        <p>{{ 'jovie.mock.intro' | translate }}</p>

        @if (!checkout.config().testMode) {
          <p class="error" role="alert">{{ 'jovie.mock.unavailable' | translate }}</p>
        } @else if (!orderNumber() || !reference() || (isBrowser && !checkout.canOpen(orderNumber(), auth.isSignedIn()))) {
          <p class="error" role="alert">{{ 'jovie.result.noAccessText' | translate }}</p>
        } @else {
          <dl>
            <div><dt>{{ 'jovie.order.number' | translate }}</dt><dd dir="ltr">{{ orderNumber() }}</dd></div>
            @if (order()) {
              <div><dt>{{ 'jovie.mock.amount' | translate }}</dt><dd>{{ amount() }}</dd></div>
            }
          </dl>
          <div class="buttons">
            <button class="jv-button" type="button" [disabled]="busy()" (click)="simulate('succeeded')">{{ 'jovie.mock.succeed' | translate }}</button>
            <button class="jv-button jv-button--night" type="button" [disabled]="busy()" (click)="simulate('failed')">{{ 'jovie.mock.fail' | translate }}</button>
          </div>
          <p class="error" role="alert">
            @if (failed()) {
              {{ 'jovie.mock.error' | translate }}
            }
          </p>
        }
        <p class="small">{{ 'jovie.mock.noCard' | translate }}</p>
        <a routerLink="/jovie/shop">{{ 'jovie.cart.continue' | translate }}</a>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      padding-block: 1.5rem clamp(3.5rem, 8vw, 6rem);
    }

    .panel {
      max-width: 36rem;
      margin-inline: auto;
      padding: clamp(1.5rem, 4vw, 2.5rem);
      border: 3px dashed var(--jv-sweetypie);
      border-radius: 18px;
      background: #fff8fa;
    }

    .stamp {
      display: inline-block;
      margin: 0 0 1rem;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      background: var(--jv-sweetypie);
      color: var(--jv-white);
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    dl {
      margin: 1.25rem 0;
    }

    dl div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(32, 53, 100, 0.15);
    }

    dd {
      margin: 0;
      font-weight: 700;
    }

    .buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .error {
      min-height: 1.2rem;
      color: var(--jv-sweetypie);
      font-weight: 700;
    }

    .small {
      font-size: 0.9rem;
    }

    a {
      font-weight: 700;
      text-decoration: underline;
    }
  `,
})
export class JovieMockPaymentPage {
  protected readonly checkout = inject(CheckoutService);
  protected readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);
  protected readonly orderNumber = computed(() => this.params()?.get('order') ?? '');
  protected readonly reference = computed(() => this.params()?.get('ref') ?? '');

  protected readonly order = signal<Order | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly amount = computed(() => {
    const order = this.order();
    return order ? formatPrice(order.totals.total, this.language.currentLanguage()) : '';
  });

  constructor() {
    if (this.isBrowser && this.orderNumber() && this.checkout.canOpen(this.orderNumber(), this.auth.isSignedIn())) {
      this.checkout.order(this.orderNumber(), this.auth.isSignedIn()).subscribe({ next: (order) => this.order.set(order), error: () => undefined });
    }
  }

  protected simulate(outcome: 'succeeded' | 'failed'): void {
    this.busy.set(true);
    this.failed.set(false);
    this.checkout.simulatePayment(this.orderNumber(), this.reference(), outcome).subscribe({
      next: () => this.router.navigate(['/jovie/checkout/payment-result'], { queryParams: { order: this.orderNumber() }, replaceUrl: true }),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
