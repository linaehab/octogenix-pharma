import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AdminAuthService } from './admin-auth.service';
import { AdminAccess, adminCan } from './admin-permissions';
import { SHIPPING_ACCESS, STORE_SETTINGS_ACCESS } from './admin-sections';

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

/**
 * /admin/settings: opens the first of its pages the admin may use (shipping fees for store managers
 * and super admins, store settings for super admins), or the 403 page.
 */
export const adminSettingsLanding: CanActivateFn = () => {
  const router = inject(Router);
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  return inject(AdminAuthService)
    .restore()
    .pipe(
      map((admin) => {
        if (!admin) {
          return router.parseUrl('/admin/login');
        }
        if (adminCan(admin, SHIPPING_ACCESS)) {
          return router.parseUrl('/admin/settings/shipping');
        }
        return router.parseUrl(adminCan(admin, STORE_SETTINGS_ACCESS) ? '/admin/settings/store' : '/admin/forbidden');
      }),
    );
};

/**
 * A dashboard section: signed-out visitors go to the admin login, admins without the section's
 * permissions to the 403 page. Typed addresses are covered too, not only the hidden links.
 */
export const adminCanActivate =
  (access: AdminAccess): CanActivateFn =>
  () => {
    const router = inject(Router);
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return true;
    }
    return inject(AdminAuthService)
      .restore()
      .pipe(
        map((admin) => {
          if (!admin) {
            return router.parseUrl('/admin/login');
          }
          return adminCan(admin, access) ? true : router.parseUrl('/admin/forbidden');
        }),
      );
  };
