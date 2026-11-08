import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { CsrfService } from '../../core/api/csrf.service';
import { MessageDetails, MessagePage, MessageQuery, MessageStatus } from './admin-messages.models';

/**
 * Contact messages API: list and details need messages.view; status changes need messages.manage.
 * The API checks the permissions, validates every change and decides what is allowed.
 */
@Injectable({ providedIn: 'root' })
export class AdminMessagesService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfService);
  private readonly base = `${inject(API_BASE_URL) ?? ''}/api/v1/admin/contact-messages`;

  static readonly TIMEOUT_MS = 20000;
  static readonly PER_PAGE = 20;

  list(query: MessageQuery): Observable<MessagePage> {
    let params = new HttpParams().set('page', query.page).set('per_page', AdminMessagesService.PER_PAGE).set('sort', query.sort);
    for (const key of ['search', 'status', 'from', 'to'] as const) {
      const value = query[key].trim();
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<MessagePage>(this.base, { params }).pipe(timeout(AdminMessagesService.TIMEOUT_MS));
  }

  /** Opening a new message marks it read on the server for admins who can manage messages. */
  get(id: number): Observable<MessageDetails> {
    return this.http.get<{ data: MessageDetails }>(`${this.base}/${id}`).pipe(timeout(AdminMessagesService.TIMEOUT_MS), map((r) => r.data));
  }

  /** Saves the status only if it is still `expected` (otherwise 409 with the current message). */
  setStatus(id: number, status: MessageStatus, expected: MessageStatus): Observable<MessageDetails> {
    return this.csrf
      .send(() =>
        this.http
          .patch<{ data: MessageDetails }>(`${this.base}/${id}`, { status, expected_status: expected })
          .pipe(timeout(AdminMessagesService.TIMEOUT_MS)),
      )
      .pipe(map((r) => r.data));
  }
}
