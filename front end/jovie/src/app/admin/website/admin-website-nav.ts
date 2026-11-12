import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type WebsiteTab = 'brands' | 'services' | 'company' | 'content';

/** Breadcrumb and tabs of the Corporate website section (all four pages need content.manage). */
@Component({
  selector: 'app-admin-website-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="web-crumbs" [attr.aria-label]="'admin.website.crumbs' | translate">
      <ol>
        <li><a routerLink="/admin">{{ 'admin.nav.overview' | translate }}</a></li>
        <li>{{ 'admin.nav.website' | translate }}</li>
        <li aria-current="page">{{ ('admin.website.tab.' + current()) | translate }}</li>
      </ol>
    </nav>
    <nav class="web-tabs" [attr.aria-label]="'admin.website.tabs' | translate">
      @for (tab of tabs; track tab) {
        <a [routerLink]="'/admin/website/' + tab" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ ('admin.website.tab.' + tab) | translate }}</a>
      }
    </nav>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    .web-crumbs ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;
      color: var(--adm-muted, #56627e);
      font-size: 0.9rem;
    }

    .web-crumbs li + li::before {
      content: '/';
      margin-inline-end: 0.5rem;
      opacity: 0.6;
    }

    .web-crumbs a {
      color: var(--adm-navy, #203366);
      font-weight: 700;
    }

    .web-tabs {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      border-bottom: 1px solid rgba(32, 51, 102, 0.15);
    }

    .web-tabs a {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      min-height: 44px;
      padding: 0 1rem;
      border-bottom: 3px solid transparent;
      color: var(--adm-muted, #56627e);
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
    }

    .web-tabs a:hover,
    .web-tabs a:focus-visible {
      color: var(--adm-navy, #203366);
    }

    .web-tabs a.is-active {
      border-bottom-color: var(--adm-navy, #203366);
      color: var(--adm-navy, #203366);
    }
  `,
})
export class AdminWebsiteNav {
  readonly current = input.required<WebsiteTab>();
  protected readonly tabs: WebsiteTab[] = ['brands', 'services', 'company', 'content'];
}
