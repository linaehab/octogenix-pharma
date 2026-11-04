import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, catchError, map, switchMap, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';

/** An approved review (ProductReviewResource). */
export interface Review {
  id: number;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  recommends: boolean | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
}

/** Computed by the server from approved reviews only. */
export interface ReviewSummary {
  count: number;
  average: number | null;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  recommend_percent: number | null;
}

export interface ReviewPage {
  reviews: Review[];
  summary: ReviewSummary;
  page: number;
  lastPage: number;
  total: number;
}

export type ReviewSort = 'newest' | 'highest' | 'lowest' | 'helpful';

export interface ReviewForm {
  name: string;
  email: string;
  rating: number | null;
  title: string;
  body: string;
  recommends: boolean | null;
  order_number: string;
  order_email: string;
  /** Honeypot. */
  website: string;
}

const VOTER_KEY = 'jovie.voter';
const VOTES_KEY = 'jovie.votes';

/**
 * Product reviews on the Laravel API: approved reviews with the rating summary, new reviews
 * (pending until approved) and "Was this helpful?" votes. The browser keeps a random voter token
 * (the server allows one vote per review and token) and which reviews it voted on.
 */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';
  private readonly csrf = inject(CsrfService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  static readonly TIMEOUT_MS = 10000;
  static readonly PER_PAGE = 5;

  list(slug: string, sort: ReviewSort, rating: number | null, page: number): Observable<ReviewPage> {
    const params: Record<string, string> = { sort, page: String(page), per_page: String(ReviewsService.PER_PAGE) };
    if (rating) {
      params['rating'] = String(rating);
    }
    return this.http
      .get<{ data: Review[]; meta: { current_page: number; last_page: number; total: number; summary: ReviewSummary } }>(
        `${this.baseUrl}/api/v1/products/${encodeURIComponent(slug)}/reviews`,
        { params },
      )
      .pipe(
        timeout(ReviewsService.TIMEOUT_MS),
        map((response) => ({
          reviews: response.data,
          summary: response.meta.summary,
          page: response.meta.current_page,
          lastPage: response.meta.last_page,
          total: response.meta.total,
        })),
      );
  }

  submit(slug: string, form: ReviewForm, locale: string): Observable<void> {
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());
    return this.post(`/api/v1/products/${encodeURIComponent(slug)}/reviews`, {
      name: form.name.trim(),
      email: optional(form.email),
      rating: form.rating,
      title: form.title.trim(),
      body: form.body.trim(),
      recommends: form.recommends,
      order_number: optional(form.order_number),
      order_email: optional(form.order_number) ? optional(form.order_email) : null,
      website: form.website,
      locale,
    }).pipe(map(() => undefined));
  }

  /** Resolves with the updated review; a 409 means this browser already voted (kept as voted). */
  vote(review: Review, helpful: boolean): Observable<Review> {
    return this.post<{ data: Review }>(`/api/v1/reviews/${review.id}/votes`, { helpful, voter_token: this.voterToken() }).pipe(
      map((response) => {
        this.remember(review.id, helpful);
        return response.data;
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.remember(review.id, helpful);
        }
        return throwError(() => error);
      }),
    );
  }

  /** The answer this browser gave on a review, if any. */
  votedOn(id: number): 'yes' | 'no' | null {
    return this.votes()[id] ?? null;
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    const send = () => this.http.post<T>(`${this.baseUrl}${path}`, body).pipe(timeout(ReviewsService.TIMEOUT_MS));
    return this.csrf.ensure().pipe(
      switchMap(send),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 419 ? this.csrf.refresh().pipe(switchMap(send)) : throwError(() => error),
      ),
    );
  }

  private voterToken(): string {
    if (!this.isBrowser) {
      return crypto.randomUUID();
    }
    let token = localStorage.getItem(VOTER_KEY);
    if (!token || !/^[0-9a-f-]{36}$/i.test(token)) {
      token = crypto.randomUUID();
      try {
        localStorage.setItem(VOTER_KEY, token);
      } catch {
        // Storage unavailable: the vote still counts once for this token.
      }
    }
    return token;
  }

  private votes(): Record<number, 'yes' | 'no'> {
    if (!this.isBrowser) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(VOTES_KEY) ?? '{}');
      return parsed && typeof parsed === 'object' ? (parsed as Record<number, 'yes' | 'no'>) : {};
    } catch {
      return {};
    }
  }

  private remember(id: number, helpful: boolean): void {
    try {
      localStorage.setItem(VOTES_KEY, JSON.stringify({ ...this.votes(), [id]: helpful ? 'yes' : 'no' }));
    } catch {
      // ignore
    }
  }
}
