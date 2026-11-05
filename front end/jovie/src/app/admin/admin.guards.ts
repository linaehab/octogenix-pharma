import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';

/** Dashboard pages: signed-in admins only. The API checks the admin guard and permissions on every request. */
export const adminOnly: CanActivateFn = () => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  return inject(AdminAuthService)
    .restore()
    .pipe(map((admin) => (admin ? true : router.parseUrl('/admin/login'))));
};

/** The admin login page: a signed-in admin goes straight to the dashboard. */
export const adminGuestOnly: CanActivateFn = () => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  return inject(AdminAuthService)
    .restore()
    .pipe(map((admin) => (admin ? router.parseUrl('/admin') : true)));
};
