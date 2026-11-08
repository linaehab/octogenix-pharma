/** Contact messages as the dashboard API returns them. */

export type MessageStatus = 'new' | 'read' | 'replied' | 'in_progress' | 'resolved' | 'spam' | 'archived';

/** The statuses the page filters and acts on (older values are still shown with their own label). */
export const MESSAGE_STATUSES: MessageStatus[] = ['new', 'read', 'replied'];

export type MessageSort = 'newest' | 'oldest';

/** One row of the list: a short preview, never the whole text. */
export interface MessageRow {
  id: number;
  site: 'corporate' | 'jovie';
  first_name: string;
  last_name: string | null;
  email: string;
  subject: string | null;
  preview: string;
  status: MessageStatus;
  assigned_admin?: { id: number; name: string } | null;
  created_at: string;
}

export interface MessageDetails {
  id: number;
  site: 'corporate' | 'jovie';
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  locale: string;
  status: MessageStatus;
  assigned_admin?: { id: number; name: string } | null;
  admin_notes: string | null;
  read_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface MessagePage {
  data: MessageRow[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface MessageQuery {
  search: string;
  status: '' | MessageStatus;
  from: string;
  to: string;
  sort: MessageSort;
  page: number;
}
