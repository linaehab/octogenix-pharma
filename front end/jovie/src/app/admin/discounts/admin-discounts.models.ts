/** Discounts & promo codes as the dashboard API returns them (money in integer piastres). */

export type DiscountType = 'percent' | 'fixed';
export type DiscountState = 'none' | 'active' | 'scheduled' | 'inactive' | 'expired';
export type PromoState = Exclude<DiscountState, 'none'>;

export interface ProductDiscount {
  type: DiscountType;
  value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

/** One product (its single size/pack) with its discount. */
export interface ProductDiscountRow {
  variant_id: number;
  product_id: number;
  product: { name: { en: string | null; ar: string | null }; is_active: boolean };
  sku: string;
  /** Regular price; null while the product has no price. */
  price_piastres: number | null;
  compare_at_price_piastres: number | null;
  /** What customers pay now. */
  effective_price_piastres: number | null;
  discount: ProductDiscount | null;
  state: DiscountState;
}

export interface ProductDiscountChange {
  type: DiscountType;
  value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface PromoUsage {
  orders_total: number;
  orders_released: number;
  orders_counted: number;
  discount_given_piastres: number;
}

export interface PromoCode {
  id: number;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_piastres: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  is_active: boolean;
  state: PromoState;
  /** Orders that still hold a use (not cancelled or expired). */
  used_count: number;
  created_at: string | null;
  updated_at: string | null;
  /** Only on the detail / save answers. */
  usage?: PromoUsage;
}

export interface PromoCodeChange {
  code?: string;
  description?: string | null;
  discount_type?: DiscountType;
  discount_value?: number;
  min_order_piastres?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit?: number | null;
  per_customer_limit?: number | null;
  is_active?: boolean;
  expected_updated_at?: string | null;
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  total: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export const MAX_PIASTRES = 4294967295;
