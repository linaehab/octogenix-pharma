import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url';
import { Language } from '../i18n/language.service';

export interface ContactMessage {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  /** Honeypot: a hidden field that people never fill in. */
  website: string;
}

@Injectable({ providedIn: 'root' })
export class ContactMessageService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL) ?? '';

  /**
   * Fetches Sanctum's XSRF-TOKEN cookie first (Angular then sends it as X-XSRF-TOKEN),
   * then posts the message. The API stores it before emailing the company.
   */
  send(form: ContactMessage, locale: Language, site: 'corporate' | 'jovie' = 'corporate'): Observable<void> {
    return this.http.get(`${this.baseUrl}/sanctum/csrf-cookie`).pipe(
      switchMap(() =>
        this.http.post(`${this.baseUrl}/api/v1/contact-messages`, {
          first_name: form.firstName,
          last_name: form.lastName,
          email: form.email,
          phone: form.phone,
          subject: form.subject,
          message: form.message,
          website: form.website,
          site,
          locale,
        }),
      ),
      map(() => undefined),
    );
  }
}
