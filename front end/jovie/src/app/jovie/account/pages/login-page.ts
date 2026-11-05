import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { failureKey, problemOf } from '../account-forms';
import { safeReturnUrl } from '../account.guards';
import { AuthShell } from '../auth-shell';
import { CustomerAuthService } from '../customer-auth.service';
import { PasswordToggle } from '../password-toggle';
import { emailAddress } from '../../../core/forms/email-address.validator';

/** /jovie/login — email and password on the customer guard; "remember me" keeps the session longer. */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShell, PasswordToggle],
  template: `
    <app-auth-shell [title]="'account.login.title' | translate" [lead]="'account.login.lead' | translate">
      @if (fromCheckout()) {
        <p class="jv-notice">{{ 'account.login.fromCheckout' | translate }}</p>
      }
      <form class="jv-form" [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="auth-title">
        <p class="jv-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>

        <div class="field">
          <label for="login-email">{{ 'account.field.email' | translate }}</label>
          <input id="login-email" type="email" formControlName="email" autocomplete="email" dir="ltr" inputmode="email"
            [attr.aria-invalid]="!!problem('email')" aria-describedby="login-email-error" />
          <p class="error" id="login-email-error">@if (problem('email'); as p) { {{ p | translate }} }</p>
        </div>

        <div class="field">
          <label for="login-password">{{ 'account.field.password' | translate }}</label>
          <app-password-toggle inputId="login-password">
            <input #password id="login-password" type="password" formControlName="password" autocomplete="current-password" dir="ltr"
              [attr.aria-invalid]="!!problem('password')" aria-describedby="login-password-error" />
          </app-password-toggle>
          <p class="error" id="login-password-error">@if (problem('password'); as p) { {{ p | translate }} }</p>
        </div>

        <div class="between">
          <label class="check"><input type="checkbox" formControlName="remember" /> {{ 'account.login.remember' | translate }}</label>
          <a class="jv-link" routerLink="/jovie/forgot-password">{{ 'account.login.forgot' | translate }}</a>
        </div>

        <button class="jv-button submit" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
          @if (submitting()) {
            <span class="jv-spinner" aria-hidden="true"></span>{{ 'account.login.submitting' | translate }}
          } @else {
            {{ 'account.login.submit' | translate }}
          }
        </button>
      </form>
      <p class="alt">
        {{ 'account.login.noAccount' | translate }}
        <a class="jv-link" routerLink="/jovie/signup" [queryParams]="returnParams()">{{ 'account.signup.link' | translate }}</a>
      </p>
    </app-auth-shell>
  `,
})
export class LoginPage {
  private readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, emailAddress, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.maxLength(255)]],
    remember: [false],
  });
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fromCheckout = signal(this.returnUrl?.startsWith('/jovie/checkout') ?? false);

  protected returnParams(): Record<string, string> | null {
    return this.returnUrl ? { returnUrl: this.returnUrl } : null;
  }

  protected problem(name: 'email' | 'password'): string | null {
    return problemOf(this.form.controls[name], this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.login(email, password, remember).subscribe({
      next: (customer) => {
        // The account's language follows the one chosen on the site, if it differs.
        if (customer.locale !== this.language.currentLanguage()) {
          this.auth.updateProfile({ locale: this.language.currentLanguage() }).subscribe({ error: () => undefined });
        }
        this.router.navigateByUrl(safeReturnUrl(this.returnUrl));
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        // 422: unknown email, wrong password and disabled account share one message (no account discovery).
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 422 ? 'account.login.failed' : failureKey(error),
        );
        this.form.controls.password.reset('');
      },
    });
  }
}
