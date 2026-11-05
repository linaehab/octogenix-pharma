import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { CustomerAuthService, whenRestored } from './customer-auth.service';

export const ACCOUNT_HOME = '/jovie/account';

/**
 * Where to go after signing in: only a page of the Jovie store, never another site or the admin
 * area (an open redirect would let a crafted link send customers elsewhere after they sign in).
 */
export function safeReturnUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/jovie') || value.startsWith('//')) {
    return ACCOUNT_HOME;
  }
  const path = value.split(/[?#]/)[0];
  return ['/jovie/login', '/jovie/signup'].includes(path) ? ACCOUNT_HOME : value;
}

/** Account pages: signed-in customers only; guests go to the login page and come back afterwards. */
export const customerOnly: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true; // rendered in the browser only (app.routes.server.ts)
  }
  return whenRestored(inject(CustomerAuthService)).pipe(
    map((signedIn) => signedIn || router.createUrlTree(['/jovie/login'], { queryParams: { returnUrl: state.url } })),
  );
};

/** Login and sign-up pages: a signed-in customer goes straight on. */
export const guestOnly: CanActivateFn = (route) => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  return whenRestored(inject(CustomerAuthService)).pipe(
    map((signedIn) => (signedIn ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl'))) : true)),
  );
};

/** Pages that behave differently for customers (checkout, orders): wait until the session is known. */
export const sessionKnown: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  return whenRestored(inject(CustomerAuthService)).pipe(map(() => true));
};
