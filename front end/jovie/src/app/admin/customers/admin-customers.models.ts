import { Money } from '../../jovie/data/jovie-product.models';

/**
 * A customer as GET /api/v1/admin/customers returns it (read-only). No password or token is ever
 * sent. Order figures count orders placed while signed in; guest orders have no customer.
 */
export interface CustomerRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  locale: string;
  /** false: the account is deactivated and cannot sign in or order. */
  is_active: boolean;
  email_verified: boolean;
  last_login_at: string | null;
  created_at: string | null;
  orders_count: number;
  /** Orders marked paid, before refunds (refunds are not recorded yet). */
  paid_total: Money;
  last_order_at: string | null;
}

export interface CustomerPage {
  data: CustomerRow[];
  meta: { current_page: number; last_page: number; total: number };
}

export type CustomerStatusFilter = '' | 'active' | 'inactive';

export interface CustomerQuery {
  search: string;
  status: CustomerStatusFilter;
  /** Registration day range (Egyptian time), YYYY-MM-DD. */
  registered_from: string;
  registered_to: string;
  page: number;
}

/** A saved address (CustomerAddressResource). */
export interface CustomerAddress {
  id: number;
  label: string | null;
  recipient_name: string;
  phone: string;
  governorate_id: number;
  city: string;
  area: string | null;
  street: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  postal_code: string | null;
  is_default: boolean;
  governorate: { id: number; code: string; name: { en: string; ar: string } } | null;
}

export interface CustomerDetails extends CustomerRow {
  addresses: CustomerAddress[];
}
