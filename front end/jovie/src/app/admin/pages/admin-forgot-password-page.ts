import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { failureKey, problemOf } from '../../jovie/account/account-forms';
import { AdminAuthService } from '../admin-auth.service';
import { emailAddress } from '../../core/forms/email-address.validator';

/** /admin/forgot-password — the same answer whether or not the email belongs to an admin. */
@Component({
  selector: 'app-admin-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <section class="adm-card" aria-labelledby="adm-forgot-title">
      <h1 id="adm-forgot-title">{{ 'account.forgot.title' | translate }}</h1>
      <p class="adm-lead">{{ 'account.forgot.lead' | translate }}</p>
      @if (sent()) {
        <div class="adm-notice is-success" role="status">{{ 'admin.forgot.sent' | translate }}</div>
      } @else {
        <form class="adm-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <p class="adm-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>
          <div class="field">
            <label for="adm-fp-email">{{ 'account.field.email' | translate }}</label>
            <input id="adm-fp-email" type="email" formControlName="email" autocomplete="username" dir="ltr"
              [attr.aria-invalid]="!!problem()" aria-describedby="adm-fp-error" />
            <p class="error" id="adm-fp-error">@if (problem(); as p) { {{ p | translate }} }</p>
          </div>
          <button class="adm-button is-block" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
            {{ (submitting() ? 'account.forgot.submitting' : 'account.forgot.submit') | translate }}
          </button>
        </form>
      }
      <p class="adm-alt"><a class="adm-link" routerLink="/admin/login">{{ 'account.backToLogin' | translate }}</a></p>
    </section>
  `,
})
export class AdminForgotPasswordPage {
  private readonly auth = inject(AdminAuthService);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, emailAddress, Validators.maxLength(255)]],
  });
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected problem(): string | null {
    return problemOf(this.form.controls.email, this.submitted());
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
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(error instanceof HttpErrorResponse && error.status === 422 ? 'jovie.form.email' : failureKey(error));
      },
    });
  }
}
