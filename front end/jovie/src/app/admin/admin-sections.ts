import { AdminAccess } from './admin-permissions';

export type AdminSectionKey =
  | 'overview'
  | 'products'
  | 'inventory'
  | 'discounts'
  | 'orders'
  | 'reports'
  | 'messages'
  | 'reviews'
  | 'customers'
  | 'settings'
  | 'adminUsers';

export interface AdminSection {
  key: AdminSectionKey;
  /** Path under /admin ('' is the overview). */
  path: string;
  /** Who may open it. Shared by the sidebar and the route guard, so a hidden link is also a closed address. */
  access: AdminAccess;
  /** Built in a later phase: the page says so and offers no actions. */
  planned: boolean;
  /** Icon drawn in a 24×24 box (stroke paths). */
  icon: string;
}

/** The two pages of the Shipping & store settings section (store managers run shipping; store settings are super-admin only). */
export const SHIPPING_ACCESS: AdminAccess = { permissions: ['shipping.manage'] };
export const STORE_SETTINGS_ACCESS: AdminAccess = { permissions: ['settings.manage'] };

/**
 * Dashboard sections. Permissions are the existing Laravel ones (App\Enums\AdminPermission):
 * - Discounts use catalog.manage (prices belong to the catalogue) until that phase decides otherwise.
 * - Sales & reports use the same rule as the overview's money figures: orders.view and payments.manage.
 * - Shipping & store settings open with either shipping.manage or settings.manage.
 */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { key: 'overview', path: '', access: { permissions: [] }, planned: false, icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z' },
  { key: 'products', path: 'products', access: { permissions: ['catalog.manage'] }, planned: false, icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9' },
  { key: 'inventory', path: 'inventory', access: { permissions: ['inventory.manage'] }, planned: false, icon: 'M3 7h18v13H3zM3 7l2-4h14l2 4M9 11h6' },
  { key: 'discounts', path: 'discounts', access: { permissions: ['catalog.manage'] }, planned: true, icon: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01' },
  { key: 'orders', path: 'orders', access: { permissions: ['orders.view'] }, planned: false, icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3' },
  { key: 'reports', path: 'reports', access: { permissions: ['orders.view', 'payments.manage'] }, planned: true, icon: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3' },
  { key: 'messages', path: 'messages', access: { permissions: ['messages.view'] }, planned: true, icon: 'M3 5h18v14H3zM3 5l9 8 9-8' },
  { key: 'reviews', path: 'reviews', access: { permissions: ['reviews.manage'] }, planned: true, icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z' },
  { key: 'customers', path: 'customers', access: { permissions: ['customers.view'] }, planned: true, icon: 'M16 20v-1a4 4 0 0 0-8 0v1M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { key: 'settings', path: 'settings', access: { permissions: ['shipping.manage', 'settings.manage'], mode: 'any' }, planned: false, icon: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
  { key: 'adminUsers', path: 'admin-users', access: { permissions: ['admins.manage'] }, planned: true, icon: 'M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6zM9 12l2 2 4-4' },
];
