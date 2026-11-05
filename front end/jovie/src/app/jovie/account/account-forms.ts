import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** The customer password policy of the API (RegisterRequest::passwordRules): 8+ characters, letters and numbers. */
export const customerPassword: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => {
  const value = control.value ?? '';
  if (value === '') {
    return null;
  }
  return value.length >= 8 && /\p{L}/u.test(value) && /\d/.test(value) ? null : { passwordRule: true };
};

/** The admin password policy (Password::defaults()): 12+ characters, upper and lower case letters and a number. */
export const adminPassword: ValidatorFn = (control: AbstractControl<string>): ValidationErrors | null => {
  const value = control.value ?? '';
  if (value === '') {
    return null;
  }
  return value.length >= 12 && /\p{Lu}/u.test(value) && /\p{Ll}/u.test(value) && /\d/.test(value)
    ? null
    : { passwordRule: true };
};

/** Group validator: `password_confirmation` must repeat `password` (the error is set on the confirmation). */
export const passwordsMatch: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const confirmation = group.get('password_confirmation');
  if (!confirmation) {
    return null;
  }
  const mismatch = (confirmation.value ?? '') !== '' && confirmation.value !== group.get('password')?.value;
  const errors = { ...(confirmation.errors ?? {}) };
  if (mismatch) {
    errors['mismatch'] = true;
  } else {
    delete errors['mismatch'];
  }
  confirmation.setErrors(Object.keys(errors).length ? errors : null);
  return null;
};

/**
 * Translation key of a control's first problem, once the visitor has left the field or submitted.
 * A server error carries its own translation key (see applyServerErrors).
 */
export function problemOf(
  control: AbstractControl | null,
  submitted: boolean,
  passwordKey = 'account.form.passwordRule',
): string | null {
  if (!control || control.valid || !(control.touched || submitted)) {
    return null;
  }
  const errors = control.errors ?? {};
  if (typeof errors['server'] === 'string') return errors['server'];
  if (errors['required']) return 'jovie.form.required';
  if (errors['email']) return 'jovie.form.email';
  if (errors['phone']) return 'jovie.form.phone';
  if (errors['passwordRule']) return passwordKey;
  if (errors['mismatch']) return 'account.form.mismatch';
  if (errors['pattern']) return 'jovie.form.postalCode';
  if (errors['maxlength']) return 'jovie.form.tooLong';
  return 'jovie.form.checkField';
}

/**
 * Puts the API's validation errors (422) on the form's controls, as translation keys: the API answers
 * in English, so its messages are matched to our own texts (`translate` picks the key for a field and
 * its message; the default is a field-level "check this field"). Returns whether any control matched.
 */
export function applyServerErrors(
  form: FormGroup,
  error: HttpErrorResponse,
  translate: (field: string, message: string) => string = () => 'jovie.form.checkField',
): boolean {
  const errors: Record<string, string[]> = error.error?.errors ?? {};
  let matched = false;
  for (const [field, messages] of Object.entries(errors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), server: translate(field, messages[0] ?? '') });
      control.markAsTouched();
      matched = true;
    }
  }
  return matched;
}

/** A general error key for a failed request that is not a validation error. */
export function failureKey(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'account.error.network';
    if (error.status === 429) return 'account.error.tooMany';
    if (error.status === 419) return 'account.error.expiredPage';
  }
  if (error instanceof Error && error.name === 'TimeoutError') return 'account.error.network';
  return 'account.error.server';
}
