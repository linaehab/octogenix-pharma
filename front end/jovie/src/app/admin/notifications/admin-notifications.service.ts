import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, Subscription, map, tap, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';

/** One in-dashboard notification (only the signed-in admin's own). */
export interface AdminNotificationItem {
  id: number;
  category: 'orders' | 'inventory' | 'messages' | 'reviews';
  type: string;
  data: Record<string, string | number | null>;
  /** An /admin path, or null when there is no page for it yet. */
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AdminNotificationPage {
  data: AdminNotificationItem[];
  meta: { current_page: number; last_page: number; total: number; unread_count: number };
}

/**
 * Notifications API and the unread count shown on the bell. There is no real-time channel in the
 * project, so the count is refreshed by polling: once when the dashboard opens, then every minute
 * while the tab is visible (and at once when the admin comes back to the tab). Polling stops when the
 * dashboard closes or the session ends.
 */
@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/notifications`;

  static readonly POLL_MS = 60000;
  static readonly TIMEOUT_MS = 15000;

  readonly unreadCount = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private request: Subscription | null = null;
  private readonly onVisible = () => {
    if (this.document.visibilityState === 'visible') {
      this.refresh();
    }
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Starts polling (once; later calls do nothing). */
  start(): void {
    if (!this.isBrowser || this.timer !== null) {
      return;
    }
    this.refresh();
    this.timer = setInterval(() => {
      if (this.document.visibilityState !== 'hidden') {
        this.refresh();
      }
    }, AdminNotificationsService.POLL_MS);
    this.document.addEventListener('visibilitychange', this.onVisible);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.document.removeEventListener('visibilitychange', this.onVisible);
    this.request?.unsubscribe();
    this.request = null;
  }

  /** Fetches the unread count now (one request at a time). */
  refresh(): void {
    if (this.request && !this.request.closed) {
      return;
    }
    this.request = this.http
      .get<{ data: { unread_count: number } }>(`${this.base}/unread-count`)
      .pipe(timeout(AdminNotificationsService.TIMEOUT_MS))
      .subscribe({
        next: (r) => this.unreadCount.set(r.data.unread_count),
        error: (error: unknown) => {
          // Signed out elsewhere: stop asking until the dashboard opens again.
          if (error instanceof HttpErrorResponse && error.status === 401) {
            this.stop();
          }
        },
      });
  }

  list(page: number, perPage: number, unreadOnly = false): Observable<AdminNotificationPage> {
    let params = new HttpParams().set('page', page).set('per_page', perPage);
    if (unreadOnly) {
      params = params.set('unread', 1);
    }
    return this.http.get<AdminNotificationPage>(this.base, { params }).pipe(
      timeout(AdminNotificationsService.TIMEOUT_MS),
      tap((r) => this.unreadCount.set(r.meta.unread_count)),
    );
  }

  markRead(id: number): Observable<AdminNotificationItem> {
    return this.csrf
      .send(() => this.http.post<{ data: AdminNotificationItem; meta: { unread_count: number } }>(`${this.base}/${id}/read`, {}))
      .pipe(
        tap((r) => this.unreadCount.set(r.meta.unread_count)),
        map((r) => r.data),
      );
  }

  markAllRead(): Observable<number> {
    return this.csrf.send(() => this.http.post<{ data: { marked: number } }>(`${this.base}/read-all`, {})).pipe(
      tap(() => this.unreadCount.set(0)),
      map((r) => r.data.marked),
    );
  }
}
