import { Component, inject, input } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CheckoutService } from './checkout.service';

/**
 * Shown only while the server runs in TEST MODE (development): says plainly that prices, stock,
 * fees and card payments are temporary test values and that no real payment is taken.
 */
@Component({
  selector: 'app-test-mode-notice',
  imports: [TranslatePipe],
  template: `
    @if (checkout.config().testMode) {
      <p class="notice" role="note">
        <strong>{{ 'jovie.test.badge' | translate }}</strong>
        <span>{{ (payment() ? 'jovie.test.payment' : 'jovie.test.store') | translate }}</span>
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .notice {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.75rem;
      margin: 0;
      padding: 0.7rem 1rem;
      border: 2px dashed var(--jv-sweetypie);
      border-radius: 10px;
      background: #fff1f5;
      color: var(--jv-night);
      font-size: 0.92rem;
      line-height: 1.45;
    }

    strong {
      padding: 0.1rem 0.55rem;
      border-radius: 4px;
      background: var(--jv-sweetypie);
      color: var(--jv-white);
      font-size: 0.8rem;
      letter-spacing: 0.06em;
    }
  `,
})
export class TestModeNotice {
  protected readonly checkout = inject(CheckoutService);
  /** The payment wording ("no real payment, no card details"). */
  readonly payment = input(false);
}
