/** Inventory API shapes (App\Http\Controllers\Api\V1\Admin\InventoryController). */

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

/** The single size of a live product and its stock. */
export interface StockRow {
  variant_id: number;
  product_id: number;
  name_en: string | null;
  name_ar: string | null;
  image_url: string | null;
  is_active: boolean;
  is_purchasable: boolean;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number | null;
  stock_status: StockStatus;
  last_movement_at: string | null;
}

export interface StockSummary {
  tracked: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  without_threshold: number;
}

export interface StockPage {
  data: StockRow[];
  meta: { current_page: number; last_page: number; total: number; summary: StockSummary };
}

/** Reasons recorded by InventoryService (App\Enums\InventoryReason). */
export type MovementReason =
  | 'initial_stock'
  | 'restock'
  | 'manual_adjustment'
  | 'stock_count_correction'
  | 'write_off'
  | 'order_reserved'
  | 'order_released'
  | 'return_restock';

/** The reasons an admin records from the dashboard. */
export type ManualReason = 'restock' | 'write_off' | 'manual_adjustment' | 'stock_count_correction';

export interface MovementRow {
  id: number;
  variant_id: number;
  sku: string | null;
  name_en: string | null;
  name_ar: string | null;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  reason: MovementReason;
  note: string | null;
  order: { id: number; order_number: string } | null;
  admin: { id: number; name: string } | null;
  created_at: string;
}

export interface MovementPage {
  data: MovementRow[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    options: {
      products: { variant_id: number; sku: string; name_en: string | null; name_ar: string | null }[];
      admins: { id: number; name: string }[];
      reasons: MovementReason[];
    };
  };
}

export interface MovementFilters {
  variant_id: string;
  reason: string;
  admin_id: string;
  order: string;
  from: string;
  to: string;
  page: number;
}

export interface StockAdjustment {
  reason: ManualReason;
  quantity?: number;
  counted_quantity?: number;
  note?: string | null;
  /** The stock the admin saw: the API refuses the adjustment (409) if it changed meanwhile. */
  expected_stock: number;
}
