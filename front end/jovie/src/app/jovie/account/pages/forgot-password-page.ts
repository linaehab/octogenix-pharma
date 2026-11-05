import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { failureKey, problemOf } from '../account-forms';
import { AuthShell } from '../auth-shell';
import { CustomerAuthService } from '../customer-auth.service';
import { emailAddress } from '../../../core/forms/email-address.validator';

/**
 * /jovie/forgot-password — asks for a reset link. The answer is the same whether or not the email
 * has an account, so the page cannot be used to find out who is registered.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AuthShell],
  template: `
    <app-auth-shell [title]="'account.forgot.title' | translate" [lead]="'account.forgot.lead' | translate">
      @if (sent()) {
        <div class="jv-notice is-success" role="status">
          <p>{{ 'account.forgot.sent' | translate }}</p>
          <p>{{ 'account.forgot.sentHint' | translate }}</p>
        </div>
        <button type="button" class="jv-link" (click)="sent.set(false)">{{ 'account.forgot.again' | translate }}</button>
      } @else {
        <form class="jv-form" [formGroup]="form" (ngSubmit)="submit()" novalidate aria-labelledby="auth-title">
          <p class="jv-notice is-error" role="alert" [hidden]="!error()">{{ error() ?? '' | translate }}</p>
          <div class="field">
            <label for="fp-email">{{ 'account.field.email' | translate }}</label>
            <input id="fp-email" type="email" formControlName="email" autocomplete="email" dir="ltr" inputmode="email"
              [attr.aria-invalid]="!!problem()" aria-describedby="fp-email-error" />
            <p class="error" id="fp-email-error">@if (problem(); as p) { {{ p | translate }} }</p>
          </div>
          <button class="jv-button submit" type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
            @if (submitting()) {
              <span class="jv-spinner" aria-hidden="true"></span>{{ 'account.forgot.submitting' | translate }}
            } @else {
              {{ 'account.forgot.submit' | translate }}
            }
          </button>
        </form>
      }
      <p class="alt"><a class="jv-link" routerLink="/jovie/login">{{ 'account.backToLogin' | translate }}</a></p>
    </app-auth-shell>
  `,
})
export class ForgotPasswordPage {
  private readonly auth = inject(CustomerAuthService);

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
