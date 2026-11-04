import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LocalizedText } from '../../../core/content/site-content.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { Money } from '../../data/jovie-product.models';
import { CartService } from '../../store/cart.service';
import { CheckoutService } from '../../store/checkout.service';
import { CartLine } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';
import { TestModeNotice } from '../../store/test-mode-notice';

/**
 * /jovie/cart, laid out like the kabrita.eu cart: a row per product (picture, name, size, unit
 * price, quantity with remove, line total) and the subtotal with Check out. Every amount, stock
 * limit and availability comes from the server (CartService); nothing is priced in the browser.
 */
@Component({
  selector: 'app-jovie-cart-page',
  imports: [RouterLink, TranslatePipe, StorePageHeader, TestModeNotice],
  templateUrl: './jovie-cart-page.html',
  styleUrl: './jovie-cart-page.css',
})
export class JovieCartPage {
  protected readonly cart = inject(CartService);
  private readonly checkout = inject(CheckoutService);
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Variant whose quantity is being saved, so only its controls wait. */
  protected readonly busy = signal<number | null>(null);
  protected readonly message = signal<{ key: string; params?: Record<string, string | number> } | null>(null);

  protected readonly lines = computed(() => this.cart.summary()?.items ?? []);

  /** Why Check out is off, or null when the cart can go to checkout. */
  protected readonly checkoutBlocked = computed(() => {
    const summary = this.cart.summary();
    if (!this.checkout.config().enabled) {
      return 'jovie.cart.storeClosed';
    }
    if (!summary || this.cart.status() !== 'ready') {
      return 'jovie.cart.updating';
    }
    if (summary.has_unavailable_items || summary.items.some((line) => !line.unit_price)) {
      return 'jovie.cart.fixUnavailable';
    }
    return summary.items.length ? null : 'jovie.cart.empty';
  });

  constructor() {
    if (this.isBrowser) {
      this.cart.refresh().subscribe({ error: () => undefined });
    }
  }

  protected pick(text: LocalizedText | null | undefined): string {
    return this.content.pick(text);
  }

  protected price(money: Money | null): string {
    return money ? formatPrice(money, this.language.currentLanguage()) : '';
  }

  protected retry(): void {
    this.cart.refresh().subscribe({ error: () => undefined });
  }

  protected change(line: CartLine, quantity: number): void {
    if (!Number.isFinite(quantity) || quantity === line.quantity || this.busy() !== null) {
      return;
    }
    const target = Math.max(1, Math.min(quantity, Math.max(1, line.max_quantity)));
    this.save(line, () => this.cart.setQuantity(line.variant_id, target), target < quantity ? target : null);
  }

  protected typed(line: CartLine, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number.parseInt(input.value, 10);
    if (!Number.isFinite(value) || value < 1) {
      input.value = String(line.quantity);
      return;
    }
    this.change(line, value);
  }

  protected remove(line: CartLine): void {
    if (this.busy() !== null) {
      return;
    }
    this.save(line, () => this.cart.remove(line.variant_id), null, { key: 'jovie.cart.removed', params: { name: this.pick(line.product?.name) } });
  }

  private save(
    line: CartLine,
    request: () => ReturnType<CartService['refresh']>,
    limitedTo: number | null,
    done: { key: string; params?: Record<string, string | number> } | null = null,
  ): void {
    this.busy.set(line.variant_id);
    this.message.set(null);
    request().subscribe({
      next: ({ adjustments }) => {
        const adjusted = adjustments.find((a) => a.variantId === line.variant_id)?.allowed ?? limitedTo;
        this.message.set(adjusted !== null ? { key: 'jovie.cart.limited', params: { count: adjusted } } : done);
        this.busy.set(null);
      },
      error: () => {
        this.message.set({ key: 'jovie.cart.updateError' });
        this.busy.set(null);
      },
    });
  }
}
