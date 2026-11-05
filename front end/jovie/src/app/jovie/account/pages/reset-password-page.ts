import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { customerPassword, failureKey, passwordsMatch, problemOf } from '../account-forms';
import { AuthShell } from '../auth-shell';
import { CustomerAuthService } from '../customer-auth.service';
import { PasswordToggle } from '../password-toggle';

/**
 * /jovie/reset-password?token=…&email=… — the page the reset email links to (CustomerPasswordLinkNotification).
 * A used, expired or wrong link is refused by the server; the page then offers a new link.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShell, PasswordToggle],
  template: `
    <app-auth-shell [title]="'account.reset.title' | translate" [lead]="done() || invalidLink() ? '' : ('account.reset.lead' | translate)">
      @if (done()) {
        <div class="jv-notice is-success" role="status"><p>{{ 'account.reset.done' | translate }}</p></div>
        <a class="jv-button submit" routerLink="/jovie/login">{{ 'account.login.submit' | translate }}</a>
      } @else if (invalidLink()) {
        <div class="jv-notice is-error" role="alert"><p>{{ 'account.reset.invalid' | translate }}</p></div>
        <a class="jv-button submit" routerLink="/jovie/forgot-password">{{ 'account.reset.newLink' | translate }}</a>
      } @else {
        <form class="jv-form" [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="auth-title">
          <p class="jv-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>
          <p class="help">{{ 'account.reset.for' | translate: { email: email } }}</p>
          <div class="field">
            <label for="rp-password">{{ 'account.field.newPassword' | translate }}</label>
            <p class="help" id="rp-password-help">{{ 'account.form.passwordHelp' | translate }}</p>
            <app-password-toggle inputId="rp-password">
              <input #password id="rp-password" type="password" formControlName="password" autocomplete="new-password" dir="ltr"
                [attr.aria-invalid]="!!problem('password')" aria-describedby="rp-password-help rp-password-error" />
            </app-password-toggle>
            <p class="error" id="rp-password-error">@if (problem('password'); as p) { {{ p | translate }} }</p>
          </div>
          <div class="field">
            <label for="rp-confirm">{{ 'account.field.confirmPassword' | translate }}</label>
            <app-password-toggle inputId="rp-confirm">
              <input #password id="rp-confirm" type="password" formControlName="password_confirmation" autocomplete="new-password" dir="ltr"
                [attr.aria-invalid]="!!problem('password_confirmation')" aria-describedby="rp-confirm-error" />
            </app-password-toggle>
            <p class="error" id="rp-confirm-error">@if (problem('password_confirmation'); as p) { {{ p | translate }} }</p>
          </div>
          <button class="jv-button submit" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
            @if (submitting()) {
              <span class="jv-spinner" aria-hidden="true"></span>{{ 'account.reset.submitting' | translate }}
            } @else {
              {{ 'account.reset.submit' | translate }}
            }
          </button>
        </form>
      }
    </app-auth-shell>
  `,
})
export class ResetPasswordPage {
  private readonly auth = inject(CustomerAuthService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly token = this.params.get('token') ?? '';
  protected readonly email = this.params.get('email') ?? '';

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.maxLength(255), customerPassword]],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly done = signal(false);
  protected readonly invalidLink = signal(!this.token || !this.email);
  protected readonly error = signal<string | null>(null);

  protected problem(name: 'password' | 'password_confirmation'): string | null {
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
    this.submitting.set(true);
    this.auth.resetPassword({ token: this.token, email: this.email, ...this.form.getRawValue() }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.done.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (error instanceof HttpErrorResponse && error.status === 422) {
          const errors = error.error?.errors ?? {};
          if (errors['password']) {
            this.form.controls.password.setErrors({ server: 'account.form.passwordRule' });
            return;
          }
          // The token or email was refused: used, expired or not ours.
          this.invalidLink.set(true);
          return;
        }
        this.error.set(failureKey(error));
      },
    });
  }
}
