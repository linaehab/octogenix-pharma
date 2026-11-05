import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from './api-base-url';

/**
 * Sanctum's XSRF-TOKEN cookie, fetched once before the first POST/PUT/DELETE of the store
 * (Angular then sends it as X-XSRF-TOKEN). `refresh()` fetches a new one after a 419.
 */
@Injectable({ providedIn: 'root' })
export class CsrfService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private ready = false;
  private pending: Observable<void> | null = null;

  ensure(): Observable<void> {
    if (this.ready) {
      return of(undefined);
    }
    this.pending ??= this.http.get(`${this.baseUrl}/sanctum/csrf-cookie`).pipe(
      tap({ next: () => (this.ready = true), error: () => (this.pending = null) }),
      map(() => undefined),
      shareReplay(1),
    );
    return this.pending;
  }

  refresh(): Observable<void> {
    this.ready = false;
    this.pending = null;
    return this.ensure();
  }

  /** Sends a state-changing request with the XSRF cookie in place, once more after a 419 (expired token). */
  send<T>(request: () => Observable<T>): Observable<T> {
    return this.ensure().pipe(
      switchMap(request),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 419
          ? this.refresh().pipe(switchMap(request))
          : throwError(() => error),
      ),
    );
  }
}
