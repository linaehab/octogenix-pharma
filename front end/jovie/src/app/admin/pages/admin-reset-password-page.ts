import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { adminPassword, failureKey, passwordsMatch, problemOf } from '../../jovie/account/account-forms';
import { PasswordToggle } from '../../jovie/account/password-toggle';
import { AdminAuthService } from '../admin-auth.service';

/**
 * /admin/reset-password?token=…&email=… — from the admin password email (also used to set the first
 * password of an account a super admin created). Admin passwords: 12+ characters, mixed case, a number.
 */
@Component({
  selector: 'app-admin-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, PasswordToggle],
  template: `
    <section class="adm-card" aria-labelledby="adm-reset-title">
      <h1 id="adm-reset-title">{{ 'account.reset.title' | translate }}</h1>
      @if (done()) {
        <div class="adm-notice is-success" role="status">{{ 'account.reset.done' | translate }}</div>
        <a class="adm-button is-block" routerLink="/admin/login">{{ 'account.login.submit' | translate }}</a>
      } @else if (invalidLink()) {
        <div class="adm-notice is-error" role="alert">{{ 'account.reset.invalid' | translate }}</div>
        <a class="adm-button is-block" routerLink="/admin/forgot-password">{{ 'account.reset.newLink' | translate }}</a>
      } @else {
        <p class="adm-lead" dir="auto">{{ 'account.reset.for' | translate: { email: email } }}</p>
        <form class="adm-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <p class="adm-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>
          <div class="field">
            <label for="adm-rp-password">{{ 'account.field.newPassword' | translate }}</label>
            <p class="help" id="adm-rp-help">{{ 'admin.form.passwordRule' | translate }}</p>
            <app-password-toggle inputId="adm-rp-password">
              <input #password id="adm-rp-password" type="password" formControlName="password" autocomplete="new-password" dir="ltr"
                [attr.aria-invalid]="!!problem('password')" aria-describedby="adm-rp-help adm-rp-error" />
            </app-password-toggle>
            <p class="error" id="adm-rp-error">@if (problem('password'); as p) { {{ p | translate }} }</p>
          </div>
          <div class="field">
            <label for="adm-rp-confirm">{{ 'account.field.confirmPassword' | translate }}</label>
            <app-password-toggle inputId="adm-rp-confirm">
              <input #password id="adm-rp-confirm" type="password" formControlName="password_confirmation" autocomplete="new-password" dir="ltr"
                [attr.aria-invalid]="!!problem('password_confirmation')" aria-describedby="adm-rp-confirm-error" />
            </app-password-toggle>
            <p class="error" id="adm-rp-confirm-error">@if (problem('password_confirmation'); as p) { {{ p | translate }} }</p>
          </div>
          <button class="adm-button is-block" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
            {{ (submitting() ? 'account.reset.submitting' : 'account.reset.submit') | translate }}
          </button>
        </form>
      }
    </section>
  `,
})
export class AdminResetPasswordPage {
  private readonly auth = inject(AdminAuthService);
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly token = this.params.get('token') ?? '';
  protected readonly email = this.params.get('email') ?? '';

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.maxLength(255), adminPassword]],
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
    return problemOf(this.form.controls[name], this.submitted(), 'admin.form.passwordRule');
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
          if (error.error?.errors?.['password']) {
            this.form.controls.password.setErrors({ server: 'admin.form.passwordRule' });
          } else {
            this.invalidLink.set(true);
          }
          return;
        }
        this.error.set(failureKey(error));
      },
    });
  }
}
