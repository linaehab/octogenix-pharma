/**
 * Report payloads of /api/v1/admin/reports/* (read-only). Money is integer piastres (EGP); every
 * figure is calculated by the API, never in the browser.
 */

export interface ReportPeriodInfo {
  from: string;
  to: string;
  timezone: string;
  days: number;
  grouping: 'day' | 'month';
}

export interface CountValue {
  count: number;
  value_piastres: number;
}

export interface CountAmount {
  count: number;
  amount_piastres: number;
}

export interface SalesReport {
  period: ReportPeriodInfo;
  currency: string;
  orders: { placed: CountValue; paid: CountValue; by_status: Record<string, CountValue> };
  payments: {
    collected: CountAmount;
    test: CountAmount;
    refund_review: CountAmount;
    possible_duplicates: { orders_count: number; extra_piastres: number };
  };
  outstanding: { total: CountValue; card_awaiting_payment: CountValue; cod_not_collected: CountValue; cod_delivered_not_collected: CountValue };
  by_method: { method: string; orders_count: number; order_value_piastres: number; collected_count: number; collected_piastres: number }[];
  trend: TrendPoint[];
}

export interface TrendPoint {
  /** "2026-11-03" (by day) or "2026-11" (by month), Egyptian time. */
  period: string;
  orders_count: number;
  order_value_piastres: number;
  collected_piastres: number;
}

export interface OrdersReportRow {
  order_number: string;
  placed_at: string;
  customer_name: string;
  governorate: { en: string; ar: string };
  status: string;
  payment_status: string;
  payment_method: string;
  total_piastres: number;
}

export interface OrdersReport {
  data: OrdersReportRow[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    period: ReportPeriodInfo;
    summary: CountValue & { paid: CountValue; outstanding: CountValue };
  };
}

export interface OrdersReportFilters {
  status: string;
  payment_status: string;
  payment_method: string;
  governorate_id: string;
}

export interface ProductReportRow {
  variant_id: number;
  product_id: number;
  sku: string;
  name_en: string;
  name_ar: string;
  archived: boolean;
  units_ordered: number;
  orders_count: number;
  gross_value_piastres: number;
  returned_units: number;
  cancelled_units: number;
  current_price_piastres: number | null;
  current_stock: number;
}

export interface InventoryReportRow {
  variant_id: number;
  sku: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  current_stock: number;
  low_stock_threshold: number | null;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  increase: number;
  decrease: number;
  movements: number;
  history_complete: boolean;
  opening_stock: number | null;
  closing_stock: number | null;
}

export interface InventoryReport {
  rows: InventoryReportRow[];
  reasons: Record<string, { increase: number; decrease: number; count: number }>;
  summary: { tracked: number; in_stock: number; low_stock: number; out_of_stock: number; increase: number; decrease: number };
}

export type PeriodPreset = 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

export interface ReportPeriod {
  preset: PeriodPreset;
  /** Calendar days in Egyptian time, both included (YYYY-MM-DD). */
  from: string;
  to: string;
}

export const REPORT_TIMEZONE = 'Africa/Cairo';
export const MAX_REPORT_DAYS = 366;

/** Today's date in Egyptian time (YYYY-MM-DD). */
export function cairoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Calendar arithmetic on YYYY-MM-DD (no time zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const parse = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)));
  return Math.round((parse(to) - parse(from)) / 86400000) + 1;
}

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, today: string = cairoToday()): ReportPeriod {
  const firstOfMonth = `${today.slice(0, 8)}01`;
  switch (preset) {
    case 'today':
      return { preset, from: today, to: today };
    case 'last_7_days':
      return { preset, from: addDays(today, -6), to: today };
    case 'last_30_days':
      return { preset, from: addDays(today, -29), to: today };
    case 'this_month':
      return { preset, from: firstOfMonth, to: today };
    case 'last_month': {
      const lastDay = addDays(firstOfMonth, -1);
      return { preset, from: `${lastDay.slice(0, 8)}01`, to: lastDay };
    }
  }
}
