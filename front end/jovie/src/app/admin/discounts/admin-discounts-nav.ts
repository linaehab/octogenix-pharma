import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Breadcrumb and tabs of the Discounts & promo codes section (both pages need catalog.manage). */
@Component({
  selector: 'app-admin-discounts-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="dsc-crumbs" [attr.aria-label]="'admin.discounts.crumbs' | translate">
      <ol>
        <li><a routerLink="/admin">{{ 'admin.nav.overview' | translate }}</a></li>
        <li>{{ 'admin.nav.discounts' | translate }}</li>
        <li aria-current="page">{{ (current() === 'products' ? 'admin.discounts.tabProducts' : 'admin.discounts.tabPromo') | translate }}</li>
      </ol>
    </nav>
    <nav class="dsc-tabs" [attr.aria-label]="'admin.discounts.tabs' | translate">
      <a routerLink="/admin/discounts/products" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ 'admin.discounts.tabProducts' | translate }}</a>
      <a routerLink="/admin/discounts/promo-codes" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ 'admin.discounts.tabPromo' | translate }}</a>
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    .dsc-crumbs ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;
      color: var(--adm-muted, #56627e);
      font-size: 0.9rem;
    }

    .dsc-crumbs li + li::before {
      content: '/';
      margin-inline-end: 0.5rem;
      opacity: 0.6;
    }

    .dsc-crumbs a {
      color: var(--adm-navy, #203366);
      font-weight: 700;
    }

    .dsc-crumbs [aria-current] {
      color: var(--adm-text, #1d2a4d);
    }

    .dsc-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(32, 51, 102, 0.15);
    }

    .dsc-tabs a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 1rem;
      border-bottom: 3px solid transparent;
      color: var(--adm-muted, #56627e);
      font-weight: 700;
      text-decoration: none;
    }

    .dsc-tabs a:hover,
    .dsc-tabs a:focus-visible {
      color: var(--adm-navy, #203366);
    }

    .dsc-tabs a.is-active {
      border-bottom-color: var(--adm-navy, #203366);
      color: var(--adm-navy, #203366);
    }
  `,
})
export class AdminDiscountsNav {
  readonly current = input.required<'products' | 'promo'>();
}
