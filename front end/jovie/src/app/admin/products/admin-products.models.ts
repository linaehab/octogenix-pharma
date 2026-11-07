/** Admin product API shapes (App\Http\Resources\Admin\ProductResource and ProductVariantResource). */

export interface AdminProductImage {
  id: number;
  url: string | null;
  alt: { en: string | null; ar: string | null };
  is_primary: boolean;
  sort_order: number;
  path?: string;
}

/** The product's single size (default variant): its SKU, price and stock. */
export interface AdminProductVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode: string | null;
  name_en: string;
  name_ar: string;
  net_weight_grams: number | null;
  price_piastres: number | null;
  compare_at_price_piastres: number | null;
  stock_quantity: number;
  low_stock_threshold: number | null;
  max_per_order: number | null;
  is_default: boolean;
  is_active: boolean;
  is_low_on_stock: boolean;
  updated_at: string | null;
}

export interface AdminProduct {
  id: number;
  brand_id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  short_description_en: string | null;
  short_description_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  stage: number | null;
  age_from_months: number | null;
  age_to_months: number | null;
  is_active: boolean;
  is_purchasable: boolean;
  is_featured: boolean;
  sort_order: number;
  variants: AdminProductVariant[];
  images: AdminProductImage[];
  order_items_count?: number;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminPage<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export type ProductStatusFilter = '' | 'active' | 'inactive' | 'archived';

export interface ProductListQuery {
  search: string;
  status: ProductStatusFilter;
  featured: '' | '1' | '0';
  page: number;
}

/** Fields sent when creating or editing (only what the form manages; other columns stay as they are). */
export interface ProductPayload {
  slug?: string;
  name_en?: string;
  name_ar?: string;
  subtitle_en?: string | null;
  subtitle_ar?: string | null;
  short_description_en?: string | null;
  short_description_ar?: string | null;
  description_en?: string | null;
  description_ar?: string | null;
  stage?: number | null;
  age_from_months?: number | null;
  age_to_months?: number | null;
  is_active?: boolean;
  is_purchasable?: boolean;
  is_featured?: boolean;
  variant?: {
    sku?: string;
    name_en?: string;
    name_ar?: string;
    net_weight_grams?: number | null;
    price_piastres?: number | null;
    compare_at_price_piastres?: number | null;
    initial_stock?: number;
  };
}

/** The product's single size: the default variant (or the first one, should none be marked). */
export function defaultVariant(product: AdminProduct): AdminProductVariant | null {
  return product.variants.find((v) => v.is_default) ?? product.variants[0] ?? null;
}

export function primaryImage(product: AdminProduct): AdminProductImage | null {
  return product.images.find((i) => i.is_primary) ?? product.images[0] ?? null;
}
