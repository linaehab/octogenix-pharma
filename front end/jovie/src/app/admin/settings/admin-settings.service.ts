import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { AdminGovernorate, GovernorateChange, SettingsList } from './admin-settings.models';

/**
 * Shipping (routes require shipping.manage) and store settings (settings.manage) APIs.
 * The API enforces the permissions and validates every value.
 */
@Injectable({ providedIn: 'root' })
export class AdminSettingsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin`;

  static readonly TIMEOUT_MS = 20000;

  governorates(): Observable<AdminGovernorate[]> {
    return this.http
      .get<{ data: AdminGovernorate[] }>(`${this.base}/governorates`)
      .pipe(timeout(AdminSettingsService.TIMEOUT_MS), map((r) => r.data));
  }

  updateGovernorate(id: number, change: GovernorateChange): Observable<AdminGovernorate> {
    return this.csrf
      .send(() => this.http.patch<{ data: AdminGovernorate }>(`${this.base}/governorates/${id}`, change).pipe(timeout(AdminSettingsService.TIMEOUT_MS)))
      .pipe(map((r) => r.data));
  }

  settings(): Observable<SettingsList> {
    return this.http.get<SettingsList>(`${this.base}/settings`).pipe(timeout(AdminSettingsService.TIMEOUT_MS));
  }

  /** Saves the given values only if the ones in `expected` are still current (otherwise 409). */
  updateSettings(settings: Record<string, unknown>, expected: Record<string, unknown>): Observable<SettingsList> {
    return this.csrf.send(() =>
      this.http.patch<SettingsList>(`${this.base}/settings`, { settings, expected }).pipe(timeout(AdminSettingsService.TIMEOUT_MS)),
    );
  }
}

/** The current values sent back with a 409 ("changed meanwhile"), or null for any other error. */
export function changedMeanwhile<T>(error: unknown): T | null {
  return error instanceof HttpErrorResponse && error.status === 409 && error.error && typeof error.error === 'object'
    ? ((error.error as { current?: T }).current ?? null)
    : null;
}
