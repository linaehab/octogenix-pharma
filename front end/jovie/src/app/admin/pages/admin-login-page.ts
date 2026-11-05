import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { failureKey, problemOf } from '../../jovie/account/account-forms';
import { PasswordToggle } from '../../jovie/account/password-toggle';
import { AdminAuthService } from '../admin-auth.service';
import { emailAddress } from '../../core/forms/email-address.validator';

/** /admin/login — dashboard sign-in (admin guard). No sign-up here: accounts are created by a super admin. */
@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, PasswordToggle],
  template: `
    <section class="adm-card" aria-labelledby="adm-login-title">
      <h1 id="adm-login-title">{{ 'admin.login.title' | translate }}</h1>
      <p class="adm-lead">{{ 'admin.login.lead' | translate }}</p>
      <form class="adm-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <p class="adm-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>
        <div class="field">
          <label for="adm-email">{{ 'account.field.email' | translate }}</label>
          <input id="adm-email" type="email" formControlName="email" autocomplete="username" dir="ltr"
            [attr.aria-invalid]="!!problem('email')" aria-describedby="adm-email-error" />
          <p class="error" id="adm-email-error">@if (problem('email'); as p) { {{ p | translate }} }</p>
        </div>
        <div class="field">
          <label for="adm-password">{{ 'account.field.password' | translate }}</label>
          <app-password-toggle inputId="adm-password">
            <input #password id="adm-password" type="password" formControlName="password" autocomplete="current-password" dir="ltr"
              [attr.aria-invalid]="!!problem('password')" aria-describedby="adm-password-error" />
          </app-password-toggle>
          <p class="error" id="adm-password-error">@if (problem('password'); as p) { {{ p | translate }} }</p>
        </div>
        <div class="between">
          <label class="check"><input type="checkbox" formControlName="remember" /> {{ 'account.login.remember' | translate }}</label>
          <a class="adm-link" routerLink="/admin/forgot-password">{{ 'account.login.forgot' | translate }}</a>
        </div>
        <button class="adm-button is-block" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
          @if (submitting()) {
            <span class="adm-spinner" aria-hidden="true"></span>{{ 'account.login.submitting' | translate }}
          } @else {
            {{ 'account.login.submit' | translate }}
          }
        </button>
      </form>
    </section>
  `,
})
export class AdminLoginPage {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, emailAddress, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.maxLength(255)]],
    remember: [false],
  });
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

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
      next: () => this.router.navigateByUrl('/admin'),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.form.controls.password.reset('');
        this.error.set(error instanceof HttpErrorResponse && error.status === 422 ? 'account.login.failed' : failureKey(error));
      },
    });
  }
}
