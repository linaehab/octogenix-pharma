import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { LanguageService } from '../../core/i18n/language.service';
import { CartService } from '../store/cart.service';
import { Customer, RegisterInput } from './account.models';

/** unknown: not checked yet (first load); guest / customer: the server answered. */
export type AuthStatus = 'unknown' | 'guest' | 'customer';

/** The parameters of the email verification link (CustomerVerifyEmailNotification). */
export interface VerificationLink {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}

/**
 * Customer accounts of the Jovie store on Laravel Sanctum's SPA session (the customer guard):
 * the session lives in an HttpOnly cookie set by the API, so nothing secret is kept in the
 * browser's storage. The state is restored after a refresh with GET /customer/me; on sign-in the
 * cart switches to the account cart (the browser cart is merged into it), on sign-out back to the
 * browser cart. Admin sign-in is separate (AdminAuthService, admin guard).
 */
@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly cart = inject(CartService);
  private readonly language = inject(LanguageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  static readonly TIMEOUT_MS = 15000;

  private readonly current = signal<Customer | null>(null);
  private readonly state = signal<AuthStatus>('unknown');
  private readonly expiredFlag = signal(false);
  private restoring: Observable<Customer | null> | null = null;

  readonly customer = this.current.asReadonly();
  readonly status = this.state.asReadonly();
  readonly isSignedIn = computed(() => this.state() === 'customer');
  /** True when the session ended on its own (not by Log out) while the customer was signed in. */
  readonly expired = this.expiredFlag.asReadonly();

  /** Asks the server who is signed in (once; later calls share the answer). */
  restore(): Observable<Customer | null> {
    if (!this.isBrowser) {
      return of(null);
    }
    if (this.state() !== 'unknown') {
      return of(this.current());
    }
    this.restoring ??= this.http.get<{ data: Customer }>(`${this.baseUrl}/api/v1/customer/me`).pipe(
      timeout(CustomerAuthService.TIMEOUT_MS),
      map((response) => response.data),
      tap((customer) => this.signedIn(customer)),
      catchError(() => {
        // 401 (no session) or no answer: browse as a guest; a later sign-in fixes the state.
        this.signedOut();
        return of(null);
      }),
      finalize(() => (this.restoring = null)),
      shareReplay(1),
    );
    return this.restoring;
  }

  login(email: string, password: string, remember: boolean): Observable<Customer> {
    return this.post<{ data: Customer }>('/auth/login', { email: email.trim(), password, remember }).pipe(
      map((response) => response.data),
      tap((customer) => this.signedIn(customer)),
    );
  }

  register(input: RegisterInput): Observable<Customer> {
    return this.post<{ data: Customer }>('/auth/register', {
      ...input,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      locale: this.language.currentLanguage(),
    }).pipe(
      map((response) => response.data),
      tap((customer) => this.signedIn(customer)),
    );
  }

  /** Signs out on the server; the browser state is cleared even when the server cannot be reached. */
  logout(): Observable<void> {
    return this.post<unknown>('/auth/logout', {}).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.signedOut()),
    );
  }

  /** Always the same answer, whether or not the email has an account. */
  forgotPassword(email: string): Observable<void> {
    return this.post<unknown>('/auth/forgot-password', { email: email.trim() }).pipe(map(() => undefined));
  }

  resetPassword(input: { token: string; email: string; password: string; password_confirmation: string }): Observable<void> {
    return this.post<unknown>('/auth/reset-password', input).pipe(map(() => undefined));
  }

  /** Opens the API's signed verification route with the link's parameters. */
  verifyEmail(link: VerificationLink): Observable<void> {
    const url = `${this.baseUrl}/api/v1/customer/email/verify/${encodeURIComponent(link.id)}/${encodeURIComponent(link.hash)}`;
    return this.http
      .get<unknown>(url, { params: { expires: link.expires, signature: link.signature } })
      .pipe(
        timeout(CustomerAuthService.TIMEOUT_MS),
        map(() => undefined),
        tap(() => {
          const customer = this.current();
          if (customer && String(customer.id) === link.id) {
            this.current.set({ ...customer, email_verified: true });
          }
        }),
      );
  }

  resendVerification(): Observable<void> {
    return this.post<unknown>('/email/verification-notification', {}).pipe(map(() => undefined));
  }

  updateProfile(changes: Partial<Pick<Customer, 'first_name' | 'last_name' | 'phone' | 'locale'>>): Observable<Customer> {
    return this.send<{ data: Customer }>('PATCH', '/me', changes).pipe(
      map((response) => response.data),
      tap((customer) => this.current.set(customer)),
    );
  }

  changePassword(input: { current_password: string; password: string; password_confirmation: string }): Observable<void> {
    return this.send<unknown>('PUT', '/me/password', input).pipe(map(() => undefined));
  }

  /** A request of an account page answered 401: the session ended while the page was open. */
  sessionEnded(): void {
    if (this.state() === 'customer') {
      this.signedOut();
      this.expiredFlag.set(true);
    }
  }

  private signedIn(customer: Customer): void {
    const wasSignedIn = this.state() === 'customer';
    this.current.set(customer);
    this.state.set('customer');
    this.expiredFlag.set(false);
    if (!wasSignedIn) {
      this.cart.useCustomerCart(() => this.sessionEnded()).subscribe({ error: () => undefined });
    }
  }

  private signedOut(): void {
    this.current.set(null);
    this.state.set('guest');
    this.cart.useGuestCart();
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.send<T>('POST', path, body);
  }

  private send<T>(method: 'POST' | 'PATCH' | 'PUT', path: string, body: unknown): Observable<T> {
    return this.csrf.send(() =>
      this.http
        .request<T>(method, `${this.baseUrl}/api/v1/customer${path}`, { body })
        .pipe(timeout(CustomerAuthService.TIMEOUT_MS)),
    ).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.sessionEnded();
        }
        return throwError(() => error);
      }),
    );
  }
}

/** Waits for the session check, then answers whether a customer is signed in. */
export function whenRestored(auth: CustomerAuthService): Observable<boolean> {
  return auth.restore().pipe(switchMap(() => of(auth.isSignedIn())));
}
