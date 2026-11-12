import type { AdminUser } from './admin-auth.service';

/**
 * Dashboard permissions, exactly as defined in Laravel (App\Enums\AdminPermission) and returned
 * by /api/v1/admin/auth/me. Angular only uses them to shape the screens; the API enforces them.
 */
export type AdminPermission =
  | 'admins.manage'
  | 'settings.manage'
  | 'content.manage'
  | 'messages.view'
  | 'messages.manage'
  | 'catalog.manage'
  | 'inventory.manage'
  | 'orders.view'
  | 'orders.manage'
  | 'orders.export'
  | 'payments.manage'
  | 'payments.record_cod'
  | 'customers.view'
  | 'shipping.manage'
  | 'reviews.manage';

/** What a page or link requires: every listed permission (`all`) or at least one of them (`any`). */
export interface AdminAccess {
  permissions: readonly AdminPermission[];
  mode?: 'all' | 'any';
}

/** True when the admin is active and holds the required permissions. No requirement means any admin. */
export function adminCan(admin: AdminUser | null, access: AdminAccess | null | undefined): boolean {
  if (!admin || !admin.is_active) {
    return false;
  }
  const required = access?.permissions ?? [];
  if (required.length === 0) {
    return true;
  }
  const held = new Set(admin.permissions);
  return access?.mode === 'any' ? required.some((p) => held.has(p)) : required.every((p) => held.has(p));
}
