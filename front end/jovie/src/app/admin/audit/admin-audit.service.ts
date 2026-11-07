import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';

export interface AuditEntry {
  id: number;
  /** id is null when the account no longer exists; the name is the one recorded at the time. */
  admin: { id: number | null; name: string };
  category: string;
  action: string;
  subject: { type: string; id: string | null; label: string | null };
  changes: Record<string, { from: unknown; to: unknown }>;
  created_at: string;
}

export interface AuditPage {
  data: AuditEntry[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    options: { admins: { id: number; name: string }[]; categories: string[]; subject_types: string[] };
  };
}

export interface AuditQuery {
  search: string;
  admin_id: string;
  category: string;
  subject_type: string;
  from: string;
  to: string;
  page: number;
}

/** The audit log API: read-only, admins.manage (enforced by the API). */
@Injectable({ providedIn: 'root' })
export class AdminAuditService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/audit-logs`;

  static readonly PER_PAGE = 25;

  list(query: AuditQuery): Observable<AuditPage> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminAuditService.PER_PAGE);
    for (const key of ['search', 'admin_id', 'category', 'subject_type', 'from', 'to'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<AuditPage>(this.base, { params }).pipe(timeout(20000));
  }
}
