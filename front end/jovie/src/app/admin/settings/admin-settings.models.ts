/** A governorate as GET /api/v1/admin/governorates returns it. Money is integer piastres. */
export interface AdminGovernorate {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  /** null: no fee set yet (delivery cannot be switched on without one). */
  shipping_fee_piastres: number | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  cod_available: boolean;
  /** Customers can choose it at checkout. */
  is_deliverable: boolean;
  sort_order: number;
  updated_at: string | null;
}

export type ShippingFilter = '' | 'enabled' | 'disabled';

/** What the fee dialog sends: only the fields that change, plus the values the admin saw. */
export interface GovernorateChange {
  shipping_fee_piastres?: number | null;
  is_deliverable?: boolean;
  expected_shipping_fee_piastres: number | null;
  expected_is_deliverable: boolean;
}

/** One row of GET /api/v1/admin/settings. */
export interface AdminSetting {
  key: string;
  group: string;
  type: string;
  is_public: boolean;
  value: unknown;
}

/** Read-only facts from the server configuration (not settings). */
export interface SettingsMeta {
  currency: string;
  test_mode: boolean;
  card_providers: string[];
}

export interface SettingsList {
  data: AdminSetting[];
  meta: SettingsMeta;
}

/** The store settings this page manages, in display order. Contact and notification settings are not part of it. */
export const STORE_SETTING_KEYS = [
  'store.enabled',
  'store.cod_enabled',
  'store.cod_fee_piastres',
  'store.card_payments_enabled',
  'store.free_shipping_threshold_piastres',
  'store.pending_payment_ttl_minutes',
] as const;

export type StoreSettingKey = (typeof STORE_SETTING_KEYS)[number];

export type StoreSettingKind = 'switch' | 'money' | 'minutes';

export interface StoreSettingDefinition {
  key: StoreSettingKey;
  kind: StoreSettingKind;
  /** Affects live checkout or customer payments: the confirmation says so. */
  sensitive: boolean;
  /** For money: may be left empty (null). */
  optional?: boolean;
  min?: number;
  max?: number;
}

export const STORE_SETTINGS: readonly StoreSettingDefinition[] = [
  { key: 'store.enabled', kind: 'switch', sensitive: true },
  { key: 'store.cod_enabled', kind: 'switch', sensitive: true },
  { key: 'store.cod_fee_piastres', kind: 'money', sensitive: true },
  { key: 'store.card_payments_enabled', kind: 'switch', sensitive: true },
  { key: 'store.free_shipping_threshold_piastres', kind: 'money', sensitive: true, optional: true },
  { key: 'store.pending_payment_ttl_minutes', kind: 'minutes', sensitive: false, min: 5, max: 1440 },
];

/** Highest amount the database stores (unsigned 32-bit piastres). */
export const MAX_PIASTRES = 4294967295;
