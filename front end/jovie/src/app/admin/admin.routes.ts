import { Routes } from '@angular/router';
import { AdminAuthFrame } from './admin-auth-frame';
import { AdminLayout } from './admin-layout';
import { AdminShell } from './admin-shell';
import { ADMIN_SECTIONS, INVENTORY_REPORT_ACCESS, SHIPPING_ACCESS, STORE_SETTINGS_ACCESS } from './admin-sections';
import { adminCanActivate, adminGuestOnly, adminOnly, adminSettingsLanding } from './admin.guards';
import { AdminAccess } from './admin-permissions';
import { AdminSectionKey } from './admin-sections';
import { unsavedChanges } from './unsaved-changes.guard';

/** The access rule of a section, from the list the sidebar is built from. */
const sectionAccess = (key: AdminSectionKey): AdminAccess => ADMIN_SECTIONS.find((s) => s.key === key)!.access;

/** Titles before the translations load (the translated ones are 'title.admin/<path>'). */
const TITLES: Record<string, string> = {
  products: 'Products',
  inventory: 'Inventory',
  discounts: 'Discounts & promo codes',
  orders: 'Orders',
  reports: 'Sales & reports',
  messages: 'Contact messages',
  reviews: 'Reviews',
  customers: 'Customers',
  settings: 'Shipping & store settings',
  'admin-users': 'Admin users',
};

/**
 * The admin area (/admin), loaded on demand: the storefront never downloads it. Sign-in pages use
 * AdminAuthFrame; everything else needs a signed-in admin (AdminShell) and, per section, the
 * permissions listed in ADMIN_SECTIONS — the same list the sidebar is built from.
 */
export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      // The signed-in dashboard comes first: with no segments left (/admin) Angular accepts a parent
      // route even if none of its children match, so the sign-in frame would otherwise take /admin.
      {
        path: '',
        component: AdminShell,
        canActivate: [adminOnly],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/admin-overview-page').then((m) => m.AdminOverviewPage),
            title: 'Dashboard | Octogenix',
          },
          {
            path: 'products',
            canActivate: [adminCanActivate(sectionAccess('products'))],
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./products/admin-products-list-page').then((m) => m.AdminProductsListPage),
                title: 'Products | Octogenix admin',
              },
              {
                path: 'new',
                canDeactivate: [unsavedChanges],
                loadComponent: () => import('./products/admin-product-form-page').then((m) => m.AdminProductFormPage),
                title: 'New product | Octogenix admin',
              },
              {
                path: ':id',
                canDeactivate: [unsavedChanges],
                loadComponent: () => import('./products/admin-product-form-page').then((m) => m.AdminProductFormPage),
                title: 'Edit product | Octogenix admin',
              },
            ],
          },
          {
            path: 'inventory',
            canActivate: [adminCanActivate(sectionAccess('inventory'))],
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./inventory/admin-inventory-page').then((m) => m.AdminInventoryPage),
                title: 'Inventory | Octogenix admin',
              },
              {
                path: 'movements',
                loadComponent: () => import('./inventory/admin-inventory-history-page').then((m) => m.AdminInventoryHistoryPage),
                title: 'Stock history | Octogenix admin',
              },
            ],
          },
          {
            path: 'orders',
            canActivate: [adminCanActivate(sectionAccess('orders'))],
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./orders/admin-orders-list-page').then((m) => m.AdminOrdersListPage),
                title: 'Orders | Octogenix admin',
              },
              {
                path: ':number',
                loadComponent: () => import('./orders/admin-order-page').then((m) => m.AdminOrderPage),
                title: 'Order | Octogenix admin',
              },
            ],
          },
          {
            path: 'audit-log',
            canActivate: [adminCanActivate(sectionAccess('auditLog'))],
            loadComponent: () => import('./audit/admin-audit-log-page').then((m) => m.AdminAuditLogPage),
            title: 'Audit log | Octogenix admin',
          },
          {
            // Every admin's own notifications (the API returns only theirs).
            path: 'notifications',
            loadComponent: () => import('./notifications/admin-notifications-page').then((m) => m.AdminNotificationsPage),
            title: 'Notifications | Octogenix admin',
          },
          {
            path: 'reports',
            canActivate: [adminCanActivate(sectionAccess('reports'))],
            loadComponent: () => import('./reports/admin-reports-page').then((m) => m.AdminReportsPage),
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'sales' },
              {
                path: 'sales',
                loadComponent: () => import('./reports/admin-sales-report').then((m) => m.AdminSalesReport),
                title: 'Sales report | Octogenix admin',
              },
              {
                path: 'orders',
                loadComponent: () => import('./reports/admin-orders-report').then((m) => m.AdminOrdersReport),
                title: 'Orders report | Octogenix admin',
              },
              {
                path: 'products',
                loadComponent: () => import('./reports/admin-products-report').then((m) => m.AdminProductsReport),
                title: 'Products report | Octogenix admin',
              },
              {
                path: 'inventory',
                canActivate: [adminCanActivate(INVENTORY_REPORT_ACCESS)],
                loadComponent: () => import('./reports/admin-inventory-report').then((m) => m.AdminInventoryReport),
                title: 'Inventory report | Octogenix admin',
              },
            ],
          },
          {
            path: 'customers',
            canActivate: [adminCanActivate(sectionAccess('customers'))],
            children: [
              {
                path: '',
                pathMatch: 'full',
                loadComponent: () => import('./customers/admin-customers-list-page').then((m) => m.AdminCustomersListPage),
                title: 'Customers | Octogenix admin',
              },
              {
                path: ':id',
                loadComponent: () => import('./customers/admin-customer-page').then((m) => m.AdminCustomerPage),
                title: 'Customer | Octogenix admin',
              },
            ],
          },
          {
            path: 'settings',
            canActivate: [adminCanActivate(sectionAccess('settings'))],
            children: [
              { path: '', pathMatch: 'full', canActivate: [adminSettingsLanding], children: [] },
              {
                path: 'shipping',
                canActivate: [adminCanActivate(SHIPPING_ACCESS)],
                loadComponent: () => import('./settings/admin-shipping-page').then((m) => m.AdminShippingPage),
                title: 'Shipping fees | Octogenix admin',
              },
              {
                path: 'store',
                canActivate: [adminCanActivate(STORE_SETTINGS_ACCESS)],
                loadComponent: () => import('./settings/admin-store-settings-page').then((m) => m.AdminStoreSettingsPage),
                title: 'Store settings | Octogenix admin',
              },
            ],
          },
          // Sections of later phases: a plain "not built yet" page, behind the same permissions.
          ...ADMIN_SECTIONS.filter((section) => section.planned).map((section) => ({
            path: section.path,
            canActivate: [adminCanActivate(section.access)],
            loadComponent: () => import('./pages/admin-section-page').then((m) => m.AdminSectionPage),
            data: { section: section.key },
            title: `${TITLES[section.path]} | Octogenix admin`,
          })),
          {
            path: 'forbidden',
            loadComponent: () => import('./pages/admin-forbidden-page').then((m) => m.AdminForbiddenPage),
            title: 'No access | Octogenix admin',
          },
        ],
      },
      {
        path: '',
        component: AdminAuthFrame,
        children: [
          {
            path: 'login',
            canActivate: [adminGuestOnly],
            loadComponent: () => import('./pages/admin-login-page').then((m) => m.AdminLoginPage),
            title: 'Admin log in | Octogenix',
          },
          {
            path: 'forgot-password',
            loadComponent: () => import('./pages/admin-forgot-password-page').then((m) => m.AdminForgotPasswordPage),
            title: 'Forgot password | Octogenix admin',
          },
          {
            path: 'reset-password',
            loadComponent: () => import('./pages/admin-reset-password-page').then((m) => m.AdminResetPasswordPage),
            title: 'Set your password | Octogenix admin',
          },
        ],
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
