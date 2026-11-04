import { LocalizedText } from '../../core/content/site-content.models';
import { Money } from '../data/jovie-product.models';

/** One line of a priced cart (CartService::summarize in Laravel). Prices come from the database. */
export interface CartLine {
  variant_id: number;
  sku: string;
  product: { slug: string; name: LocalizedText; image_url: string | null } | null;
  variant_name: LocalizedText;
  /** null when the variant cannot be bought (inactive, no price, no stock). */
  unit_price: Money | null;
  quantity: number;
  line_total: Money | null;
  is_available: boolean;
  max_quantity: number;
  exceeds_available_quantity: boolean;
}

/** POST /api/v1/cart/preview: the browser cart priced by the server. Nothing is stored. */
export interface CartSummary {
  items: CartLine[];
  subtotal: Money;
  item_count: number;
  has_unavailable_items: boolean;
}

/** GET /api/v1/governorates (GovernorateResource). */
export interface Governorate {
  id: number;
  code: string;
  name: LocalizedText;
  is_deliverable: boolean;
  shipping_fee: Money | null;
  delivery_days: { min: number; max: number | null } | null;
  cod_available: boolean;
}

export type PaymentMethod = 'cod' | 'card';

export interface OrderItem {
  sku: string;
  product_name: LocalizedText;
  variant_name: LocalizedText;
  image_url: string | null;
  unit_price: Money;
  quantity: number;
  line_total: Money;
}

/** OrderResource: the customer / guest view of an order. */
export interface Order {
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: PaymentMethod;
  can_cancel: boolean;
  totals: { subtotal: Money; discount: Money; shipping_fee: Money; cod_fee: Money; total: Money };
  contact: { first_name: string; last_name: string; email: string; phone: string };
  shipping_address: {
    recipient_name: string;
    phone: string;
    governorate: LocalizedText;
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
  items: OrderItem[];
  placed_at: string;
  payment_expires_at: string | null;
}

/** What a guest types at checkout (CheckoutRequest, guest branch). */
export interface GuestCheckoutForm {
  contact: { first_name: string; last_name: string; email: string; phone: string };
  address: {
    recipient_name: string;
    phone: string;
    governorate_id: number | null;
    city: string;
    area: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    landmark: string;
    postal_code: string;
  };
  payment_method: PaymentMethod | null;
  customer_note: string;
}
