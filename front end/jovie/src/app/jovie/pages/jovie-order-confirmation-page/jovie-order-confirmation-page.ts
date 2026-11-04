import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CheckoutService } from '../../store/checkout.service';
import { OrderDetails } from '../../store/order-details';
import { Order } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';
import { TestModeNotice } from '../../store/test-mode-notice';

/** /jovie/checkout/confirmation/:orderNumber — the placed order, as the server recorded it. */
@Component({
  selector: 'app-jovie-order-confirmation-page',
  imports: [RouterLink, TranslatePipe, StorePageHeader, TestModeNotice, OrderDetails],
  template: `
    <app-store-page-header [title]="'jovie.confirmation.title' | translate" />
    <section class="jv-container page">
      <app-test-mode-notice />
      @switch (state()) {
        @case ('ready') {
          @let o = order()!;
          <div class="panel">
            <p class="number">{{ 'jovie.order.number' | translate }}: <strong dir="ltr">{{ o.order_number }}</strong></p>
            <p>{{ 'jovie.confirmation.text' | translate: { email: o.contact.email } }}</p>
            <p>{{ ('jovie.confirmation.next.' + o.payment_method) | translate }}</p>
          </div>
          <app-order-details [order]="o" />
        }
        @case ('noAccess') {
          <div class="panel"><p>{{ 'jovie.result.noAccessText' | translate }}</p></div>
        }
        @case ('error') {
          <div class="panel" role="alert"><p>{{ 'jovie.result.errorText' | translate }}</p></div>
        }
        @default {
          <p>{{ 'jovie.cart.loading' | translate }}</p>
        }
      }
      <p><a class="jv-button jv-button--night" routerLink="/jovie/shop">{{ 'jovie.cart.continue' | translate }}</a></p>
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
      border-inline-start: 6px solid #11795f;
      border-radius: 12px;
      background: var(--jv-panel);
    }

    .panel p {
      margin: 0 0 0.5rem;
    }
  `,
})
export class JovieOrderConfirmationPage {
  private readonly checkout = inject(CheckoutService);

  protected readonly order = signal<Order | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'noAccess' | 'error'>('loading');

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    const number = inject(ActivatedRoute).snapshot.paramMap.get('orderNumber') ?? '';
    if (!number || !this.checkout.hasToken(number)) {
      this.state.set('noAccess');
      return;
    }
    this.checkout.order(number).subscribe({
      next: (order) => {
        this.order.set(order);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }
}
