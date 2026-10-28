import { LocalizedText } from '../../core/content/site-content.models';

/** Money as the API sends it: integer piastres (design v0.3 §2). */
export interface Money {
  amount_piastres: number;
  currency: string;
}

export interface ApiProductImage {
  id: number;
  url: string;
  alt: LocalizedText;
  is_primary: boolean;
  sort_order: number;
}

export interface ApiProductVariant {
  id: number;
  sku: string;
  name: LocalizedText;
  net_weight_grams: number | null;
  price: Money | null;
  compare_at_price: Money | null;
  is_default: boolean;
  is_available: boolean;
  max_per_order: number | null;
}

/** One item of GET /api/v1/products (ProductResource, listing shape). */
export interface ApiProduct {
  slug: string;
  brand: { slug: string; name: LocalizedText };
  name: LocalizedText;
  subtitle: LocalizedText;
  short_description: LocalizedText;
  stage: number | null;
  age_from_months: number | null;
  age_to_months: number | null;
  is_featured: boolean;
  image: ApiProductImage | null;
  price_from: Money | null;
  is_available: boolean;
  variants: ApiProductVariant[];
}
