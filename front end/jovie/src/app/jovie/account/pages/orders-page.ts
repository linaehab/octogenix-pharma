import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { Order } from '../../store/store.models';
import { AccountApiService } from '../account-api.service';
import { AccountShell } from '../account-shell';
import { failureKey } from '../account-forms';

/** /jovie/account/orders — the customer's orders, newest first, with the totals the server recorded. */
@Component({
  selector: 'app-orders-page',
  imports: [RouterLink, TranslatePipe, AccountShell],
  template: `
    <app-account-shell [title]="'account.nav.orders' | translate">
      @switch (state()) {
        @case ('loading') {
          <p role="status">{{ 'jovie.cart.loading' | translate }}</p>
        }
        @case ('error') {
          <div class="jv-notice is-error" role="alert">
            <p>{{ error() ?? 'account.error.server' | translate }}</p>
            <button type="button" class="jv-link" (click)="load(page())">{{ 'jovie.shop.retry' | translate }}</button>
          </div>
        }
        @default {
          @if (orders().length) {
            <ul class="orders">
              @for (o of orders(); track o.order_number) {
                <li class="account-card order">
                  <div class="head">
                    <p class="number">{{ 'jovie.order.number' | translate }} <strong dir="ltr">{{ o.order_number }}</strong></p>
                    <span class="status" [attr.data-status]="o.status">{{ ('account.status.' + o.status) | translate }}</span>
                  </div>
                  <p class="meta">
                    {{ date(o.placed_at) }} ·
                    {{ 'account.orders.items' | translate: { count: count(o) } }} ·
                    <strong>{{ price(o) }}</strong>
                  </p>
                  <a class="jv-link" [routerLink]="['/jovie/account/orders', o.order_number]">{{ 'account.orders.view' | translate }}</a>
                </li>
              }
            </ul>
            @if (lastPage() > 1) {
              <nav class="pages" [attr.aria-label]="'account.orders.pages' | translate">
                <button type="button" class="jv-button jv-button--light" [disabled]="page() <= 1" (click)="load(page() - 1)">{{ 'account.orders.newer' | translate }}</button>
                <span>{{ page() }} / {{ lastPage() }}</span>
                <button type="button" class="jv-button jv-button--light" [disabled]="page() >= lastPage()" (click)="load(page() + 1)">{{ 'account.orders.older' | translate }}</button>
              </nav>
            }
          } @else {
            <div class="account-empty">
              <p>{{ 'account.orders.empty' | translate }}</p>
              <a class="jv-button" routerLink="/jovie/shop">{{ 'jovie.cart.continue' | translate }}</a>
            </div>
          }
        }
      }
    </app-account-shell>
  `,
  styles: `
    .orders {
      display: grid;
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
    }

    .number,
    .meta {
      margin: 0 0 0.5rem;
    }

    .status {
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      background: var(--jv-sunshine-soft);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .status[data-status='delivered'] {
      background: #dff3ec;
    }

    .status[data-status='cancelled'],
    .status[data-status='expired'],
    .status[data-status='returned'] {
      background: #eceef3;
    }

    .pages {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
  `,
})
export class OrdersPage {
  private readonly api = inject(AccountApiService);
  private readonly language = inject(LanguageService);

  protected readonly orders = signal<Order[]>([]);
  protected readonly page = signal(1);
  protected readonly lastPage = signal(1);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly error = signal<string | null>(null);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.load(1);
    }
  }

  protected load(page: number): void {
    this.state.set('loading');
    this.api.orders(page).subscribe({
      next: (result) => {
        this.orders.set(result.orders);
        this.page.set(result.page);
        this.lastPage.set(result.lastPage);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        this.error.set(failureKey(error));
        this.state.set('error');
      },
    });
  }

  protected count(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  protected price(order: Order): string {
    return formatPrice(order.totals.total, this.language.currentLanguage());
  }

  protected date(value: string): string {
    return new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', {
      dateStyle: 'medium',
    }).format(new Date(value));
  }
}
