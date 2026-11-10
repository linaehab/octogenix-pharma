import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { AdminRoleName, AdminUser } from '../admin-auth.service';

export type AdminUserSort = 'name' | 'newest' | 'oldest' | 'last_login';

export interface AdminUserQuery {
  search: string;
  role: '' | AdminRoleName;
  status: '' | 'active' | 'inactive';
  sort: AdminUserSort;
  page: number;
}

export interface AdminUserPage {
  data: AdminUser[];
  meta: { current_page: number; last_page: number; total: number; roles: AdminRoleName[]; active_super_admins: number };
}

export interface NewAdminUser {
  name: string;
  email: string;
  role: AdminRoleName;
  locale: 'en' | 'ar';
}

export interface AdminUserChange {
  name?: string;
  role?: AdminRoleName;
  is_active?: boolean;
  locale?: 'en' | 'ar';
  expected_updated_at?: string | null;
}

/**
 * Admin accounts API (routes require admins.manage: super admins only). The API enforces every
 * rule: no self role change or self deactivation, one active super admin at least, no secrets.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/admin-users`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;

  list(query: AdminUserQuery): Observable<AdminUserPage> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminUsersService.PER_PAGE).set('sort', query.sort);
    for (const key of ['search', 'role', 'status'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<AdminUserPage>(this.base, { params }).pipe(timeout(AdminUsersService.TIMEOUT_MS));
  }

  /** Creates the account; `invitation` says whether email is really sent in this environment. */
  create(admin: NewAdminUser): Observable<{ user: AdminUser; invitation: 'queued' | 'not_delivered' }> {
    return this.csrf
      .send(() =>
        this.http
          .post<{ data: AdminUser; meta: { invitation: 'queued' | 'not_delivered' } }>(this.base, admin)
          .pipe(timeout(AdminUsersService.TIMEOUT_MS)),
      )
      .pipe(map((r) => ({ user: r.data, invitation: r.meta.invitation })));
  }

  /** Saves only if the account was not changed since `expected_updated_at` (otherwise 409). */
  update(id: number, change: AdminUserChange): Observable<AdminUser> {
    return this.csrf
      .send(() => this.http.patch<{ data: AdminUser }>(`${this.base}/${id}`, change).pipe(timeout(AdminUsersService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }
}
