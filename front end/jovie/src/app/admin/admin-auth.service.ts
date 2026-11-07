import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../core/api/api-base-url';
import { CsrfService } from '../core/api/csrf.service';
import { AdminAccess, AdminPermission, adminCan } from './admin-permissions';

/** AdminUserResource (GET /api/v1/admin/auth/me). Permissions only shape the screens; the API enforces them. */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'content_editor' | 'store_manager' | 'support';
  is_active: boolean;
  locale: string | null;
  permissions: AdminPermission[];
  last_login_at: string | null;
  created_at: string | null;
}

/**
 * Dashboard sign-in on the admin guard (Laravel Sanctum SPA session, separate from customer
 * accounts: signing in or out here does not touch a customer session in the same browser).
 * There is no sign-up: admin accounts are created with `php artisan admin:create-super-admin`
 * or by a super admin.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  static readonly TIMEOUT_MS = 15000;

  private readonly current = signal<AdminUser | null>(null);
  private readonly checked = signal(false);
  private restoring: Observable<AdminUser | null> | null = null;

  readonly admin = this.current.asReadonly();
  readonly isSignedIn = computed(() => this.current() !== null);

  /** Whether the signed-in admin holds the given permissions (shapes the screens; the API enforces them). */
  can(access: AdminAccess | null | undefined): boolean {
    return adminCan(this.current(), access);
  }

  /** The API answered 401 (session expired or ended elsewhere): forget the admin locally. */
  sessionEnded(): void {
    this.current.set(null);
    this.checked.set(true);
  }

  restore(): Observable<AdminUser | null> {
    if (!this.isBrowser) {
      return of(null);
    }
    if (this.checked()) {
      return of(this.current());
    }
    this.restoring ??= this.http.get<{ data: AdminUser }>(`${this.baseUrl}/api/v1/admin/auth/me`).pipe(
      timeout(AdminAuthService.TIMEOUT_MS),
      map((response) => response.data),
      catchError(() => of(null)),
      tap((admin) => {
        this.current.set(admin);
        this.checked.set(true);
      }),
      finalize(() => (this.restoring = null)),
      shareReplay(1),
    );
    return this.restoring;
  }

  login(email: string, password: string, remember: boolean): Observable<AdminUser> {
    return this.post<{ data: AdminUser }>('/auth/login', { email: email.trim(), password, remember }).pipe(
      map((response) => response.data),
      tap((admin) => {
        this.current.set(admin);
        this.checked.set(true);
      }),
    );
  }

  logout(): Observable<void> {
    return this.post<unknown>('/auth/logout', {}).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => {
        this.current.set(null);
        this.checked.set(true);
      }),
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.post<unknown>('/auth/forgot-password', { email: email.trim() }).pipe(map(() => undefined));
  }

  resetPassword(input: { token: string; email: string; password: string; password_confirmation: string }): Observable<void> {
    return this.post<unknown>('/auth/reset-password', input).pipe(map(() => undefined));
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.csrf
      .send(() => this.http.post<T>(`${this.baseUrl}/api/v1/admin${path}`, body).pipe(timeout(AdminAuthService.TIMEOUT_MS)))
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.current.set(null);
          }
          return throwError(() => error);
        }),
      );
  }
}
