import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { egyptianMobile } from '../../pages/jovie-checkout-page/jovie-checkout-page';
import { applyServerErrors, customerPassword, failureKey, passwordsMatch, problemOf } from '../account-forms';
import { safeReturnUrl } from '../account.guards';
import { AuthShell } from '../auth-shell';
import { CustomerAuthService } from '../customer-auth.service';
import { PasswordToggle } from '../password-toggle';
import { emailAddress } from '../../../core/forms/email-address.validator';

type Field = 'first_name' | 'last_name' | 'email' | 'phone' | 'password' | 'password_confirmation';

/**
 * /jovie/signup — name, email, mobile number and password; nothing else (addresses are added later,
 * in My Addresses or at checkout). The account is signed in straight away and a confirmation email
 * is sent; the browser cart is merged into the new account.
 */
@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShell, PasswordToggle],
  template: `
    <app-auth-shell [title]="'account.signup.title' | translate" [lead]="'account.signup.lead' | translate">
      <form class="jv-form" [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="auth-title">
        <p class="jv-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>

        <div class="row">
          <div class="field">
            <label for="su-first">{{ 'jovie.checkout.firstName' | translate }}</label>
            <input id="su-first" formControlName="first_name" autocomplete="given-name"
              [attr.aria-invalid]="!!problem('first_name')" aria-describedby="su-first-error" />
            <p class="error" id="su-first-error">@if (problem('first_name'); as p) { {{ p | translate }} }</p>
          </div>
          <div class="field">
            <label for="su-last">{{ 'jovie.checkout.lastName' | translate }}</label>
            <input id="su-last" formControlName="last_name" autocomplete="family-name"
              [attr.aria-invalid]="!!problem('last_name')" aria-describedby="su-last-error" />
            <p class="error" id="su-last-error">@if (problem('last_name'); as p) { {{ p | translate }} }</p>
          </div>
        </div>

        <div class="field">
          <label for="su-email">{{ 'account.field.email' | translate }}</label>
          <input id="su-email" type="email" formControlName="email" autocomplete="email" dir="ltr" inputmode="email"
            [attr.aria-invalid]="!!problem('email')" aria-describedby="su-email-error" />
          <p class="error" id="su-email-error">@if (problem('email'); as p) { {{ p | translate }} }</p>
        </div>

        <div class="field">
          <label for="su-phone">{{ 'account.field.phone' | translate }}</label>
          <input id="su-phone" type="tel" formControlName="phone" autocomplete="tel" inputmode="tel" dir="ltr" placeholder="01012345678"
            [attr.aria-invalid]="!!problem('phone')" aria-describedby="su-phone-error" />
          <p class="error" id="su-phone-error">@if (problem('phone'); as p) { {{ p | translate }} }</p>
        </div>

        <div class="field">
          <label for="su-password">{{ 'account.field.password' | translate }}</label>
          <p class="help" id="su-password-help">{{ 'account.form.passwordHelp' | translate }}</p>
          <app-password-toggle inputId="su-password">
            <input #password id="su-password" type="password" formControlName="password" autocomplete="new-password" dir="ltr"
              [attr.aria-invalid]="!!problem('password')" aria-describedby="su-password-help su-password-error" />
          </app-password-toggle>
          <p class="error" id="su-password-error">@if (problem('password'); as p) { {{ p | translate }} }</p>
        </div>

        <div class="field">
          <label for="su-confirm">{{ 'account.field.confirmPassword' | translate }}</label>
          <app-password-toggle inputId="su-confirm">
            <input #password id="su-confirm" type="password" formControlName="password_confirmation" autocomplete="new-password" dir="ltr"
              [attr.aria-invalid]="!!problem('password_confirmation')" aria-describedby="su-confirm-error" />
          </app-password-toggle>
          <p class="error" id="su-confirm-error">@if (problem('password_confirmation'); as p) { {{ p | translate }} }</p>
        </div>

        <button class="jv-button submit" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
          @if (submitting()) {
            <span class="jv-spinner" aria-hidden="true"></span>{{ 'account.signup.submitting' | translate }}
          } @else {
            {{ 'account.signup.submit' | translate }}
          }
        </button>
      </form>
      <p class="alt">
        {{ 'account.signup.haveAccount' | translate }}
        <a class="jv-link" routerLink="/jovie/login" [queryParams]="returnParams()">{{ 'account.login.link' | translate }}</a>
      </p>
    </app-auth-shell>
  `,
})
export class SignupPage {
  private readonly auth = inject(CustomerAuthService);
  private readonly router = inject(Router);
  private readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      first_name: ['', [Validators.required, Validators.maxLength(80)]],
      last_name: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, emailAddress, Validators.maxLength(255)]],
      phone: ['', [Validators.required, Validators.maxLength(30), egyptianMobile]],
      password: ['', [Validators.required, Validators.maxLength(255), customerPassword]],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected returnParams(): Record<string, string> | null {
    return this.returnUrl ? { returnUrl: this.returnUrl } : null;
  }

  protected problem(name: Field): string | null {
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
    const value = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.register(value).subscribe({
      next: () => {
        // The new account is signed in; the welcome page asks to confirm the email address.
        this.router.navigate(['/jovie/account'], {
          queryParams: { welcome: 1, ...(this.returnUrl ? { returnUrl: safeReturnUrl(this.returnUrl) } : {}) },
        });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 422) {
          const matched = applyServerErrors(this.form, error, (field, message) =>
            field === 'email'
              ? /taken/i.test(message)
                ? 'account.signup.emailTaken'
                : 'jovie.form.email'
              : field === 'password'
                ? 'account.form.passwordRule'
                : field === 'phone'
                  ? 'jovie.form.phone'
                  : 'jovie.form.checkField',
          );
          this.error.set(matched ? 'jovie.checkout.checkFields' : 'account.error.server');
          return;
        }
        this.error.set(failureKey(error));
      },
    });
  }
}
