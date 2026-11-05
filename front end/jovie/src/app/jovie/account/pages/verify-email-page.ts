import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { failureKey } from '../account-forms';
import { AuthShell } from '../auth-shell';
import { CustomerAuthService, VerificationLink } from '../customer-auth.service';

type State = 'checking' | 'verified' | 'expired' | 'invalid' | 'error';

/**
 * /jovie/verify-email?id=…&hash=…&expires=…&signature=… — the page the confirmation email links to.
 * The API checks the signature and expiry; an expired or broken link can be replaced by a new one.
 * Opening the link again after confirming simply shows the success state.
 */
@Component({
  selector: 'app-verify-email-page',
  imports: [RouterLink, TranslatePipe, AuthShell],
  template: `
    <app-auth-shell [title]="'account.verify.title' | translate">
      @switch (state()) {
        @case ('checking') {
          <p role="status"><span class="jv-spinner" aria-hidden="true"></span> {{ 'account.verify.checking' | translate }}</p>
        }
        @case ('verified') {
          <div class="jv-notice is-success" role="status"><p>{{ 'account.verify.done' | translate }}</p></div>
          <a class="jv-button submit" [routerLink]="auth.isSignedIn() ? '/jovie/account' : '/jovie/login'">
            {{ (auth.isSignedIn() ? 'account.nav.account' : 'account.login.submit') | translate }}
          </a>
        }
        @default {
          <div class="jv-notice is-error" role="alert">
            <p>{{ ('account.verify.' + state()) | translate }}</p>
          </div>
          @if (auth.isSignedIn()) {
            @if (resent()) {
              <p class="jv-notice is-success" role="status">{{ 'account.verify.resent' | translate }}</p>
            } @else {
              <button type="button" class="jv-button submit" [disabled]="resending()" (click)="resend()">
                {{ 'account.verify.resend' | translate }}
              </button>
              <p class="jv-notice is-error" role="alert" [hidden]="!resendError()">{{ resendError() ?? '' | translate }}</p>
            }
          } @else {
            <p>{{ 'account.verify.signInToResend' | translate }}</p>
            <a class="jv-button submit" routerLink="/jovie/login" [queryParams]="{ returnUrl: '/jovie/account' }">
              {{ 'account.login.submit' | translate }}
            </a>
          }
        }
      }
    </app-auth-shell>
  `,
  styles: `
    .jv-spinner {
      display: inline-block;
      vertical-align: -0.15em;
    }
  `,
})
export class VerifyEmailPage {
  protected readonly auth = inject(CustomerAuthService);
  protected readonly state = signal<State>('checking');
  protected readonly resending = signal(false);
  protected readonly resent = signal(false);
  protected readonly resendError = signal<string | null>(null);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    const link: VerificationLink = {
      id: params.get('id') ?? '',
      hash: params.get('hash') ?? '',
      expires: params.get('expires') ?? '',
      signature: params.get('signature') ?? '',
    };
    if (!link.id || !link.hash || !link.expires || !link.signature) {
      this.state.set('invalid');
      return;
    }
    // An expired link fails the signature check too; tell the two apart by the link's own expiry.
    const expired = Number(link.expires) * 1000 < Date.now();
    this.auth.verifyEmail(link).subscribe({
      next: () => this.state.set('verified'),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.state.set(expired ? 'expired' : 'invalid');
        } else if (error instanceof HttpErrorResponse && error.status === 404) {
          this.state.set('invalid');
        } else {
          this.state.set('error');
        }
      },
    });
  }

  protected resend(): void {
    this.resending.set(true);
    this.resendError.set(null);
    this.auth.resendVerification().subscribe({
      next: () => {
        this.resending.set(false);
        this.resent.set(true);
      },
      error: (error: unknown) => {
        this.resending.set(false);
        this.resendError.set(failureKey(error));
      },
    });
  }
}
