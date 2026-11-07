import { HttpErrorResponse } from '@angular/common/http';

/** Validation errors of a 422 answer, keyed by field ("name_en", "variant.price_piastres", …). */
export function apiFieldErrors(error: unknown): Record<string, string[]> {
  if (error instanceof HttpErrorResponse && error.status === 422 && error.error && typeof error.error === 'object') {
    const errors = (error.error as { errors?: Record<string, string[]> }).errors;
    return errors && typeof errors === 'object' ? errors : {};
  }
  return {};
}

/** Messages worth showing to the admin (the API's own explanation), or none for network/server errors. */
export function apiErrorMessages(error: unknown): string[] {
  const fields = Object.values(apiFieldErrors(error)).flat();
  if (fields.length) {
    return [...new Set(fields)];
  }
  if (error instanceof HttpErrorResponse && error.status === 403) {
    const message = (error.error as { message?: string } | null)?.message;
    return message ? [message] : [];
  }
  return [];
}
