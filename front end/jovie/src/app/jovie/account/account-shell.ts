import { Component, ViewEncapsulation, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CustomerAuthService } from './customer-auth.service';

/**
 * Frame of the account pages: the yellow title band with the customer's name, the account tabs
 * (My account, My orders, My addresses) and Log out. Also loads the account form styles.
 */
@Component({
  selector: 'app-account-shell',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="account-shell__band">
      <div class="jv-container">
        @if (auth.customer(); as c) {
          <p class="account-shell__hello">{{ 'account.hello' | translate: { name: c.first_name } }}</p>
        }
        <h1>{{ title() }}</h1>
        <nav class="account-shell__tabs" [attr.aria-label]="'account.nav.label' | translate">
          @for (tab of tabs; track tab.path) {
            <a [routerLink]="tab.path" routerLinkActive="is-active" ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: tab.exact }">{{ tab.label | translate }}</a>
          }
          <button type="button" class="account-shell__logout" [disabled]="loggingOut()" (click)="logout()">
            {{ 'account.nav.logout' | translate }}
          </button>
        </nav>
      </div>
    </div>
    <section class="jv-container account-shell__body">
      <ng-content />
    </section>
  `,
  styleUrls: ['./account-forms.css', './account-shell.css'],
})
export class AccountShell {
  protected readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  readonly title = input.required<string>();
  protected readonly loggingOut = signal(false);

  protected readonly tabs = [
    { path: '/jovie/account', label: 'account.nav.account', exact: true },
    { path: '/jovie/account/orders', label: 'account.nav.orders', exact: false },
    { path: '/jovie/account/addresses', label: 'account.nav.addresses', exact: true },
  ];

  constructor() {
    // The session ended while an account page was open (expired, or signed out in another tab).
    effect(() => {
      if (this.auth.expired()) {
        this.router.navigate(['/jovie/login'], { queryParams: { returnUrl: this.router.url } });
      }
    });
  }

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({ complete: () => this.router.navigateByUrl('/jovie') });
  }
}
