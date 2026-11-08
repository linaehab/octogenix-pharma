/** Product reviews as the dashboard API returns them. Only approved reviews are public. */

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'hidden';

export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'hidden', 'rejected'];

/** Allowed moderation changes (the API checks the same rules). */
export const REVIEW_ACTIONS: Record<ReviewStatus, { target: ReviewStatus; action: 'approve' | 'reject' | 'hide' | 'restore' }[]> = {
  pending: [
    { target: 'approved', action: 'approve' },
    { target: 'rejected', action: 'reject' },
  ],
  approved: [{ target: 'hidden', action: 'hide' }],
  hidden: [{ target: 'approved', action: 'restore' }],
  rejected: [],
};

export type ReviewSort = 'newest' | 'oldest';

export interface ReviewProduct {
  id: number;
  slug: string | null;
  name: { en: string | null; ar: string | null };
}

/** One row of the list: a short preview and no email address. */
export interface ReviewRow {
  id: number;
  author_name: string;
  rating: number;
  title: string;
  preview: string;
  is_verified_purchase: boolean;
  status: ReviewStatus;
  product: ReviewProduct;
  created_at: string;
  updated_at: string;
}

export interface ReviewDetails {
  id: number;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string;
  body: string;
  recommends: boolean | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  status: ReviewStatus;
  locale: string;
  product: ReviewProduct;
  order_number: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewPage {
  data: ReviewRow[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    totals: Record<ReviewStatus | 'all', number> & { approved_average: number | null };
    products: { id: number; name: { en: string; ar: string } }[];
  };
}

export interface ReviewQuery {
  search: string;
  status: '' | ReviewStatus;
  product_id: string;
  rating: string;
  from: string;
  to: string;
  sort: ReviewSort;
  page: number;
}
