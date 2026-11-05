import { AbstractControl, ValidationErrors } from '@angular/forms';

/** RFC "dot-atom" local part: no spaces, no leading, trailing or double dots. */
const LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
/** Domain with at least one dot and a 2+ letter top-level domain (or an internationalised xn-- one). */
const DOMAIN = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{1,59})$/;

/**
 * Email check matching the API's EmailAddress rule. Angular's Validators.email (like Laravel's
 * plain `email` rule) accepts "dema@gmail" or "a@b", which can never receive our emails.
 * Returns `{ email: true }`, so the forms' existing "enter a valid email" messages apply.
 * Empty values are left to Validators.required.
 */
export function emailAddress(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (value === '') {
    return null;
  }
  const at = value.lastIndexOf('@');
  if (at < 1 || value.length > 254) {
    return { email: true };
  }
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  return local.length <= 64 && LOCAL.test(local) && DOMAIN.test(domain) ? null : { email: true };
}
