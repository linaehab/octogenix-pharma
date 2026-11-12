/** Admin order API shapes (OrderListResource and Admin\OrderResource). Money is integer piastres. */
import { Money } from '../../jovie/data/jovie-product.models';

export type OrderStatus =
  | 'pending_payment'
  | 'pending_confirmation'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'expired'
  | 'returned';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cod' | 'card';

export interface OrderListRow {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  customer: { first_name: string; last_name: string; phone: string };
  items_count: number;
  lines_count: number;
  total: Money;
  governorate: { id: number; en: string; ar: string };
  refund_review: boolean;
  placed_at: string;
  updated_at: string | null;
  /** When the fulfillment stage last changed (from the order history). */
  last_status_at?: string | null;
  /** Row actions for this admin, from the API rules (null without orders.manage). */
  actions?: { next: OrderStatus | null; other: OrderStatus[] } | null;
}

/** A status tab: a group of real statuses defined and counted by the API ("all" has no statuses). */
export interface OrderListTab {
  key: 'all' | 'new' | 'in_progress' | 'ready' | 'delivered' | 'closed' | string;
  statuses: OrderStatus[];
  count: number;
}

export interface OrderListPage {
  data: OrderListRow[];
  meta: { current_page: number; last_page: number; total: number };
  options: { governorates: { id: number; en: string; ar: string }[]; tabs?: OrderListTab[] };
}

export interface OrderListQuery {
  /** Status tab ('' = all). Sent to the list and to the Excel export. */
  tab: string;
  search: string;
  status: string;
  payment_status: string;
  payment_method: string;
  governorate_id: string;
  from: string;
  to: string;
  page: number;
}

export interface OrderPayment {
  id: number;
  provider: string;
  method: PaymentMethod;
  status: 'initiated' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
  amount: Money;
  merchant_reference: string;
  provider_transaction_id: string | null;
  provider_reference: string | null;
  card_brand: string | null;
  card_last4: string | null;
  failure_message: string | null;
  is_test: boolean;
  created_at: string | null;
  paid_at: string | null;
  collected_by: { id: number; name: string } | null;
}

export interface OrderHistoryEntry {
  field: 'status' | 'payment_status' | string;
  from: string | null;
  to: string;
  actor: 'customer' | 'guest' | 'admin' | 'system' | 'payment_gateway';
  admin: { id: number; name: string } | null;
  note: string | null;
  customer_visible: boolean;
  at: string;
}

export interface OrderStockMovement {
  reason: 'order_reserved' | 'order_released' | 'return_restock' | string;
  quantity_change: number;
  sku: string | null;
  admin: { id: number; name: string } | null;
  at: string;
}

/** What the backend allows this admin to do now (from the order rules and permissions). */
export interface OrderActionsAllowed {
  statuses: OrderStatus[];
  reason_required: OrderStatus[];
  cod_collect: boolean;
  restock_returned: boolean;
  edit_note: boolean;
}

export interface AdminOrder {
  id: number;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  totals: { subtotal: Money; discount: Money; shipping_fee: Money; cod_fee: Money; total: Money };
  amounts: { received: Money; outstanding: Money };
  contact: { first_name: string; last_name: string; email: string; phone: string };
  shipping_address: {
    recipient_name: string;
    phone: string;
    governorate: { en: string; ar: string };
    city: string;
    area: string | null;
    street: string;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    landmark: string | null;
    postal_code: string | null;
  };
  customer_note: string | null;
  items: {
    sku: string;
    product_name: { en: string; ar: string };
    variant_name: { en: string; ar: string };
    image_url: string | null;
    unit_price: Money;
    /** Price before the product's own discount (null when it had none). */
    regular_unit_price?: Money | null;
    quantity: number;
    /** This line's share of the promo code discount. */
    promo_discount?: Money;
    line_total: Money;
  }[];
  /** The promo code used, as it was at checkout. */
  promo?: { code: string; type: 'percent' | 'fixed'; value: number } | null;
  placed_at: string;
  updated_at: string | null;
  payment_expires_at: string | null;
  is_guest: boolean;
  admin_note: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  timestamps: Record<'confirmed_at' | 'paid_at' | 'shipped_at' | 'delivered_at' | 'cancelled_at' | 'returned_at', string | null>;
  warnings: ('refund_may_be_due' | 'duplicate_payment' | 'test_payment')[];
  payments: OrderPayment[];
  history: OrderHistoryEntry[];
  stock_movements: OrderStockMovement[];
  actions: OrderActionsAllowed | null;
}
