import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CustomerAuthService } from '../../account/customer-auth.service';

/**
 * The profile button of the Jovie header and its dropdown: Log in / Sign up for visitors, the
 * account pages and Log out for signed-in customers. A disclosure (button + list of links), closed
 * by Escape, a click outside or a navigation. Follows the session state as soon as it changes.
 */
@Component({
  selector: 'app-account-menu',
  imports: [RouterLink, TranslatePipe],
  template: `
    <button #trigger type="button" class="trigger" [class.is-signed-in]="auth.isSignedIn()"
      aria-controls="jovie-account-menu" [attr.aria-expanded]="open()"
      [attr.aria-label]="(auth.isSignedIn() ? 'account.menu.labelSignedIn' : 'account.menu.label') | translate: { name: auth.customer()?.first_name ?? '' }"
      (click)="toggle()">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="3.75" /><path d="M4.75 20c.9-3.6 3.8-5.75 7.25-5.75s6.35 2.15 7.25 5.75" /></svg>
      @if (auth.isSignedIn()) {
        <span class="dot" aria-hidden="true"></span>
      }
    </button>

    <div id="jovie-account-menu" class="panel" [hidden]="!open()">
      @if (auth.customer(); as c) {
        <p class="who">
          <strong dir="auto">{{ c.first_name }} {{ c.last_name }}</strong>
          <span dir="ltr">{{ c.email }}</span>
        </p>
        <ul>
          <li><a routerLink="/jovie/account" (click)="close()">{{ 'account.nav.account' | translate }}</a></li>
          <li><a routerLink="/jovie/account/orders" (click)="close()">{{ 'account.nav.orders' | translate }}</a></li>
          <li><a routerLink="/jovie/account/addresses" (click)="close()">{{ 'account.nav.addresses' | translate }}</a></li>
          <li><button type="button" [disabled]="loggingOut()" (click)="logout()">{{ 'account.nav.logout' | translate }}</button></li>
        </ul>
      } @else {
        <ul>
          <li><a routerLink="/jovie/login" [queryParams]="returnParams()" (click)="close()">{{ 'account.login.link' | translate }}</a></li>
          <li><a routerLink="/jovie/signup" [queryParams]="returnParams()" (click)="close()">{{ 'account.signup.link' | translate }}</a></li>
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }

    .trigger {
      position: relative;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: var(--jv-white);
      color: var(--jv-night);
      cursor: pointer;
    }

    .trigger:focus-visible {
      outline: 3px solid var(--jv-night);
      outline-offset: 2px;
    }

    svg {
      width: 1.4rem;
      height: 1.4rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
    }

    .dot {
      position: absolute;
      top: 0.1rem;
      inset-inline-end: 0.1rem;
      width: 0.7rem;
      height: 0.7rem;
      border: 2px solid var(--jv-white);
      border-radius: 50%;
      background: #11795f;
    }

    .panel {
      position: absolute;
      top: calc(100% + 0.6rem);
      inset-inline-end: 0;
      z-index: 20;
      width: max-content;
      min-width: 13rem;
      max-width: min(20rem, calc(100vw - 2rem));
      padding: 0.5rem;
      border-radius: 14px;
      background: var(--jv-white);
      color: var(--jv-night);
      box-shadow: 0 14px 34px rgba(32, 53, 100, 0.22);
    }

    .who {
      display: grid;
      margin: 0 0 0.35rem;
      padding: 0.5rem 0.75rem 0.75rem;
      border-bottom: 1px solid rgba(32, 53, 100, 0.15);
      overflow-wrap: anywhere;
    }

    .who span {
      font-size: 0.85rem;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    a,
    button:not(.trigger) {
      display: block;
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 0;
      border-radius: 8px;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 700;
      text-align: start;
      text-decoration: none;
      cursor: pointer;
    }

    a:hover,
    a:focus-visible,
    button:not(.trigger):hover,
    button:not(.trigger):focus-visible {
      background: var(--jv-panel);
    }
  `,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeAndFocus()',
  },
})
export class AccountMenu {
  protected readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly open = signal(false);
  protected readonly loggingOut = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.open.set(false));

    // The session is checked once the page is in the browser, so the button shows the right state.
    const document = inject(DOCUMENT);
    afterNextRender(() => {
      if (document.defaultView) {
        this.auth.restore().subscribe();
      }
    });
  }

  /** Coming back here after logging in: the current page (except the sign-in pages themselves). */
  protected returnParams(): Record<string, string> | null {
    const url = this.router.url;
    return url.startsWith('/jovie') && !/^\/jovie\/(login|signup|forgot-password|reset-password)/.test(url)
      ? { returnUrl: url }
      : null;
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected closeAndFocus(): void {
    if (this.open()) {
      this.open.set(false);
      (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('.trigger')?.focus();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !(this.host.nativeElement as HTMLElement).contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({
      complete: () => {
        this.loggingOut.set(false);
        this.open.set(false);
        this.router.navigateByUrl('/jovie');
      },
    });
  }
}
