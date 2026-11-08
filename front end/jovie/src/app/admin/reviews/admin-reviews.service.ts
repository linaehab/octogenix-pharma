import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { ReviewDetails, ReviewPage, ReviewQuery, ReviewStatus } from './admin-reviews.models';

/**
 * Review moderation API (routes require reviews.manage). The API checks the permissions and the
 * allowed status changes; only approved reviews are ever public.
 */
@Injectable({ providedIn: 'root' })
export class AdminReviewsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/reviews`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;

  list(query: ReviewQuery): Observable<ReviewPage> {
    let params = new HttpParams()
      .set('summary', 1)
      .set('page', query.page)
      .set('per_page', AdminReviewsService.PER_PAGE)
      .set('sort', query.sort);
    for (const key of ['search', 'status', 'product_id', 'rating', 'from', 'to'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<ReviewPage>(this.base, { params }).pipe(timeout(AdminReviewsService.TIMEOUT_MS));
  }

  get(id: number): Observable<ReviewDetails> {
    return this.http.get<{ data: ReviewDetails }>(`${this.base}/${id}`).pipe(timeout(AdminReviewsService.TIMEOUT_MS), map((r) => r.data));
  }

  /** Changes the status only if it is still `expected` (otherwise 409 with the current review). */
  setStatus(id: number, status: ReviewStatus, expected: ReviewStatus): Observable<ReviewDetails> {
    return this.csrf
      .send(() =>
        this.http
          .patch<{ data: ReviewDetails }>(`${this.base}/${id}`, { status, expected_status: expected })
          .pipe(timeout(AdminReviewsService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }
}

/** "★★★★☆" for a rating from 1 to 5. */
export function stars(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}
