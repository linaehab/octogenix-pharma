import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { egyptianMobile } from '../../pages/jovie-checkout-page/jovie-checkout-page';
import { applyServerErrors, customerPassword, failureKey, passwordsMatch, problemOf } from '../account-forms';
import { safeReturnUrl } from '../account.guards';
import { AccountShell } from '../account-shell';
import { CustomerAuthService } from '../customer-auth.service';
import { PasswordToggle } from '../password-toggle';

/** /jovie/account — the customer's details, email confirmation, profile and password. */
@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AccountShell, PasswordToggle],
  template: `
    <app-account-shell [title]="'account.nav.account' | translate">
      @if (auth.customer(); as c) {
        @if (welcome()) {
          <div class="jv-notice is-success" role="status">
            <p>{{ 'account.welcome' | translate: { name: c.first_name } }}</p>
            @if (continueUrl(); as url) {
              <a class="jv-button" [routerLink]="url">{{ 'account.welcomeContinue' | translate }}</a>
            }
          </div>
        }

        @if (!c.email_verified) {
          <div class="jv-notice" role="status">
            <p><strong>{{ 'account.verifyBanner.title' | translate }}</strong></p>
            <p>{{ 'account.verifyBanner.text' | translate: { email: c.email } }}</p>
            @if (resent()) {
              <p>{{ 'account.verify.resent' | translate }}</p>
            } @else {
              <p>
                <button type="button" class="jv-link" [disabled]="resending()" (click)="resend()">{{ 'account.verify.resend' | translate }}</button>
              </p>
            }
            @if (resendError(); as e) {
              <p class="error">{{ e | translate }}</p>
            }
          </div>
        }

        <section class="account-card" aria-labelledby="acc-details">
          <h2 id="acc-details">{{ 'account.details.title' | translate }}</h2>
          @if (!editing()) {
            <dl class="account-facts">
              <dt>{{ 'account.details.name' | translate }}</dt><dd dir="auto">{{ c.first_name }} {{ c.last_name }}</dd>
              <dt>{{ 'account.field.email' | translate }}</dt>
              <dd dir="ltr">{{ c.email }}
                <small>· {{ (c.email_verified ? 'account.details.verified' : 'account.details.notVerified') | translate }}</small>
              </dd>
              <dt>{{ 'account.field.phone' | translate }}</dt><dd dir="ltr">{{ c.phone || ('account.details.none' | translate) }}</dd>
              @if (since(); as s) {
                <dt>{{ 'account.details.since' | translate }}</dt><dd>{{ s }}</dd>
              }
            </dl>
            @if (saved()) {
              <p class="jv-notice is-success" role="status">{{ 'account.details.saved' | translate }}</p>
            }
            <button type="button" class="jv-button jv-button--night" (click)="edit()">{{ 'account.details.edit' | translate }}</button>
          } @else {
            <form class="jv-form" [formGroup]="profile" (ngSubmit)="saveProfile()" novalidate>
              <p class="jv-notice is-error" role="alert" [hidden]="!profileError()">{{ profileError() ?? '' | translate }}</p>
              <div class="row">
                <div class="field">
                  <label for="pr-first">{{ 'jovie.checkout.firstName' | translate }}</label>
                  <input id="pr-first" formControlName="first_name" autocomplete="given-name"
                    [attr.aria-invalid]="!!problem('first_name')" aria-describedby="pr-first-error" />
                  <p class="error" id="pr-first-error">@if (problem('first_name'); as p) { {{ p | translate }} }</p>
                </div>
                <div class="field">
                  <label for="pr-last">{{ 'jovie.checkout.lastName' | translate }}</label>
                  <input id="pr-last" formControlName="last_name" autocomplete="family-name"
                    [attr.aria-invalid]="!!problem('last_name')" aria-describedby="pr-last-error" />
                  <p class="error" id="pr-last-error">@if (problem('last_name'); as p) { {{ p | translate }} }</p>
                </div>
              </div>
              <div class="field">
                <label for="pr-phone">{{ 'account.field.phone' | translate }}</label>
                <input id="pr-phone" type="tel" formControlName="phone" autocomplete="tel" inputmode="tel" dir="ltr" placeholder="01012345678"
                  [attr.aria-invalid]="!!problem('phone')" aria-describedby="pr-phone-error" />
                <p class="error" id="pr-phone-error">@if (problem('phone'); as p) { {{ p | translate }} }</p>
              </div>
              <p class="help">{{ 'account.details.emailFixed' | translate }}</p>
              <div class="actions">
                <button class="jv-button" type="submit" [disabled]="savingProfile()" [attr.aria-busy]="savingProfile()">
                  {{ (savingProfile() ? 'account.saving' : 'account.save') | translate }}
                </button>
                <button class="jv-button jv-button--light" type="button" (click)="editing.set(false)">{{ 'account.cancel' | translate }}</button>
              </div>
            </form>
          }
        </section>

        <section class="account-card" aria-labelledby="acc-password">
          <h2 id="acc-password">{{ 'account.password.title' | translate }}</h2>
          <form class="jv-form" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
            <p class="jv-notice is-error" role="alert" [hidden]="!passwordError()">{{ passwordError() ?? '' | translate }}</p>
            @if (passwordChanged()) {
              <p class="jv-notice is-success" role="status">{{ 'account.password.changed' | translate }}</p>
            }
            <div class="field">
              <label for="pw-current">{{ 'account.field.currentPassword' | translate }}</label>
              <app-password-toggle inputId="pw-current">
                <input #password id="pw-current" type="password" formControlName="current_password" autocomplete="current-password" dir="ltr"
                  [attr.aria-invalid]="!!pwProblem('current_password')" aria-describedby="pw-current-error" />
              </app-password-toggle>
              <p class="error" id="pw-current-error">@if (pwProblem('current_password'); as p) { {{ p | translate }} }</p>
            </div>
            <div class="row">
              <div class="field">
                <label for="pw-new">{{ 'account.field.newPassword' | translate }}</label>
                <app-password-toggle inputId="pw-new">
                  <input #password id="pw-new" type="password" formControlName="password" autocomplete="new-password" dir="ltr"
                    [attr.aria-invalid]="!!pwProblem('password')" aria-describedby="pw-help pw-new-error" />
                </app-password-toggle>
                <p class="error" id="pw-new-error">@if (pwProblem('password'); as p) { {{ p | translate }} }</p>
              </div>
              <div class="field">
                <label for="pw-confirm">{{ 'account.field.confirmPassword' | translate }}</label>
                <app-password-toggle inputId="pw-confirm">
                  <input #password id="pw-confirm" type="password" formControlName="password_confirmation" autocomplete="new-password" dir="ltr"
                    [attr.aria-invalid]="!!pwProblem('password_confirmation')" aria-describedby="pw-confirm-error" />
                </app-password-toggle>
                <p class="error" id="pw-confirm-error">@if (pwProblem('password_confirmation'); as p) { {{ p | translate }} }</p>
              </div>
            </div>
            <p class="help" id="pw-help">{{ 'account.form.passwordHelp' | translate }}</p>
            <div class="actions">
              <button class="jv-button jv-button--night" type="submit" [disabled]="savingPassword()" [attr.aria-busy]="savingPassword()">
                {{ (savingPassword() ? 'account.saving' : 'account.password.submit') | translate }}
              </button>
            </div>
          </form>
        </section>
      }
    </app-account-shell>
  `,
})
export class AccountPage {
  protected readonly auth = inject(CustomerAuthService);
  private readonly language = inject(LanguageService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly welcome = signal(this.query.has('welcome'));
  protected readonly continueUrl = signal(this.query.get('returnUrl') ? safeReturnUrl(this.query.get('returnUrl')) : null);

  protected readonly since = computed(() => {
    const created = this.auth.customer()?.created_at;
    return created
      ? new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'long' }).format(new Date(created))
      : null;
  });

  protected readonly editing = signal(false);
  protected readonly saved = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly profileSubmitted = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly profile = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(80)]],
    last_name: ['', [Validators.required, Validators.maxLength(80)]],
    phone: ['', [Validators.required, Validators.maxLength(30), egyptianMobile]],
  });

  protected readonly resending = signal(false);
  protected readonly resent = signal(false);
  protected readonly resendError = signal<string | null>(null);

  protected readonly savingPassword = signal(false);
  protected readonly passwordSubmitted = signal(false);
  protected readonly passwordChanged = signal(false);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly passwordForm = this.fb.group(
    {
      current_password: ['', [Validators.required, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.maxLength(255), customerPassword]],
      password_confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected problem(name: 'first_name' | 'last_name' | 'phone'): string | null {
    return problemOf(this.profile.controls[name], this.profileSubmitted());
  }

  protected pwProblem(name: 'current_password' | 'password' | 'password_confirmation'): string | null {
    return problemOf(this.passwordForm.controls[name], this.passwordSubmitted());
  }

  protected edit(): void {
    const c = this.auth.customer();
    if (!c) {
      return;
    }
    this.profile.reset({ first_name: c.first_name, last_name: c.last_name, phone: c.phone ? `0${c.phone.slice(3)}` : '' });
    this.profileSubmitted.set(false);
    this.profileError.set(null);
    this.saved.set(false);
    this.editing.set(true);
  }

  protected saveProfile(): void {
    this.profileSubmitted.set(true);
    this.profileError.set(null);
    if (this.savingProfile()) {
      return;
    }
    if (this.profile.invalid) {
      this.profile.markAllAsTouched();
      return;
    }
    const value = this.profile.getRawValue();
    const changes = {
      first_name: value.first_name.trim(),
      last_name: value.last_name.trim(),
      phone: value.phone.trim(),
    };
    this.savingProfile.set(true);
    this.auth.updateProfile(changes).subscribe({
      next: () => {
        this.savingProfile.set(false);
        this.editing.set(false);
        this.saved.set(true);
      },
      error: (error: unknown) => {
        this.savingProfile.set(false);
        if (error instanceof HttpErrorResponse && error.status === 422) {
          applyServerErrors(this.profile, error, (field) => (field === 'phone' ? 'jovie.form.phone' : 'jovie.form.checkField'));
          this.profileError.set('jovie.checkout.checkFields');
          return;
        }
        this.profileError.set(failureKey(error));
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

  protected changePassword(): void {
    this.passwordSubmitted.set(true);
    this.passwordError.set(null);
    this.passwordChanged.set(false);
    if (this.savingPassword()) {
      return;
    }
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.auth.changePassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordChanged.set(true);
        this.passwordSubmitted.set(false);
        this.passwordForm.reset();
      },
      error: (error: unknown) => {
        this.savingPassword.set(false);
        if (error instanceof HttpErrorResponse && error.status === 422) {
          applyServerErrors(this.passwordForm, error, (field) =>
            field === 'current_password' ? 'account.password.wrongCurrent' : field === 'password' ? 'account.form.passwordRule' : 'jovie.form.checkField',
          );
          return;
        }
        this.passwordError.set(failureKey(error));
      },
    });
  }
}
