import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { SHIPPING_ACCESS, STORE_SETTINGS_ACCESS } from '../admin-sections';

/**
 * Breadcrumb and tabs of the Shipping & store settings section. A tab is shown only to admins
 * who may open its page (the route guard and the API check the same permissions).
 */
@Component({
  selector: 'app-admin-settings-nav',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="set-crumbs" [attr.aria-label]="'admin.settings.crumbs' | translate">
      <ol>
        <li><a routerLink="/admin">{{ 'admin.nav.overview' | translate }}</a></li>
        <li>{{ 'admin.nav.settings' | translate }}</li>
        <li aria-current="page">{{ (current() === 'shipping' ? 'admin.settings.tabShipping' : 'admin.settings.tabStore') | translate }}</li>
      </ol>
    </nav>
    @if (tabs().length > 1) {
      <nav class="set-tabs" [attr.aria-label]="'admin.settings.tabs' | translate">
        @for (tab of tabs(); track tab.path) {
          <a [routerLink]="tab.path" routerLinkActive="is-active" ariaCurrentWhenActive="page">{{ tab.label | translate }}</a>
        }
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1rem;
    }

    .set-crumbs ol {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      margin: 0 0 0.75rem;
      padding: 0;
      list-style: none;
      color: var(--adm-muted, #56627e);
      font-size: 0.9rem;
    }

    .set-crumbs li + li::before {
      content: '/';
      margin-inline-end: 0.5rem;
      opacity: 0.6;
    }

    .set-crumbs a {
      color: var(--adm-navy, #203366);
      font-weight: 700;
    }

    .set-crumbs [aria-current] {
      color: var(--adm-text, #1d2a4d);
    }

    .set-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(32, 51, 102, 0.15);
    }

    .set-tabs a {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 1rem;
      border-bottom: 3px solid transparent;
      color: var(--adm-muted, #56627e);
      font-weight: 700;
      text-decoration: none;
    }

    .set-tabs a:hover,
    .set-tabs a:focus-visible {
      color: var(--adm-navy, #203366);
    }

    .set-tabs a.is-active {
      border-bottom-color: var(--adm-navy, #203366);
      color: var(--adm-navy, #203366);
    }
  `,
})
export class AdminSettingsNav {
  private readonly auth = inject(AdminAuthService);

  readonly current = input.required<'shipping' | 'store'>();

  protected readonly tabs = computed(() =>
    [
      { path: '/admin/settings/shipping', label: 'admin.settings.tabShipping', access: SHIPPING_ACCESS },
      { path: '/admin/settings/store', label: 'admin.settings.tabStore', access: STORE_SETTINGS_ACCESS },
    ].filter((tab) => this.auth.can(tab.access)),
  );
}
