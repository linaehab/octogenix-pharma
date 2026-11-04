import { Component, computed, inject, input } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LocalizedText } from '../../core/content/site-content.models';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../data/format-price';
import { Money } from '../data/jovie-product.models';
import { Order } from './store.models';

/** An order as the server recorded it: items, totals, delivery address and payment method. */
@Component({
  selector: 'app-order-details',
  imports: [TranslatePipe],
  template: `
    @let o = order();
    <div class="grid">
      <section class="box" [attr.aria-label]="'jovie.order.items' | translate">
        <h2>{{ 'jovie.order.items' | translate }}</h2>
        <ul class="items">
          @for (item of o.items; track item.sku) {
            <li>
              @if (item.image_url) {
                <img [src]="item.image_url" alt="" width="64" height="64" loading="lazy" />
              }
              <span class="name">
                {{ pick(item.product_name) }}
                <small>{{ pick(item.variant_name) }} · × {{ item.quantity }}</small>
              </span>
              <span class="amount">{{ price(item.line_total) }}</span>
            </li>
          }
        </ul>
        <dl class="totals">
          <div><dt>{{ 'jovie.cart.subtotal' | translate }}</dt><dd>{{ price(o.totals.subtotal) }}</dd></div>
          <div><dt>{{ 'jovie.checkout.shipping' | translate }}</dt><dd>{{ price(o.totals.shipping_fee) }}</dd></div>
          @if (o.payment_method === 'cod') {
            <div><dt>{{ 'jovie.checkout.codFee' | translate }}</dt><dd>{{ price(o.totals.cod_fee) }}</dd></div>
          }
          <div class="total"><dt>{{ 'jovie.checkout.total' | translate }}</dt><dd>{{ price(o.totals.total) }}</dd></div>
        </dl>
      </section>

      <section class="box" [attr.aria-label]="'jovie.order.delivery' | translate">
        <h2>{{ 'jovie.order.delivery' | translate }}</h2>
        <address>
          <strong>{{ o.shipping_address.recipient_name }}</strong><br />
          {{ addressLine() }}<br />
          {{ o.shipping_address.city }}, {{ pick(o.shipping_address.governorate) }}<br />
          <span dir="ltr">{{ o.shipping_address.phone }}</span>
        </address>
        <h2>{{ 'jovie.checkout.payment' | translate }}</h2>
        <p>{{ ('jovie.checkout.method.' + o.payment_method) | translate }}</p>
        <h2>{{ 'jovie.order.contact' | translate }}</h2>
        <p>{{ o.contact.first_name }} {{ o.contact.last_name }}<br /><span dir="ltr">{{ o.contact.email }}</span></p>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 1.5rem;
    }

    .box {
      padding: clamp(1.25rem, 3vw, 2rem);
      border-radius: 18px;
      background: var(--jv-panel);
    }

    h2 {
      margin: 0 0 0.6rem;
      font-size: 1.1rem;
    }

    h2:not(:first-child) {
      margin-top: 1.25rem;
    }

    .items {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .items li {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(32, 53, 100, 0.15);
    }

    .items img {
      width: 4rem;
      height: 4rem;
      object-fit: contain;
    }

    .name {
      flex: 1;
      font-weight: 700;
    }

    .name small {
      display: block;
      font-weight: 400;
    }

    .totals {
      margin: 0.75rem 0 0;
    }

    .totals div {
      display: flex;
      justify-content: space-between;
      padding: 0.3rem 0;
    }

    .totals dd {
      margin: 0;
    }

    .total {
      margin-top: 0.4rem;
      padding-top: 0.6rem !important;
      border-top: 2px solid var(--jv-night);
      font-size: 1.15rem;
      font-weight: 700;
    }

    address,
    p {
      margin: 0;
      font-style: normal;
      line-height: 1.6;
    }

    @media (max-width: 799px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OrderDetails {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  readonly order = input.required<Order>();

  protected readonly addressLine = computed(() => {
    const a = this.order().shipping_address;
    return [a.street, a.building, a.floor, a.apartment, a.area, a.landmark].filter(Boolean).join(', ');
  });

  protected pick(text: LocalizedText | null | undefined): string {
    return this.content.pick(text);
  }

  protected price(money: Money): string {
    return formatPrice(money, this.language.currentLanguage());
  }
}
