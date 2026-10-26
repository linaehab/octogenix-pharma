import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Observable, catchError, firstValueFrom, forkJoin, map, of, timeout } from 'rxjs';
import { API_BASE_URL } from '../api/api-base-url';
import { LanguageService } from '../i18n/language.service';
import {
  ApiBrand,
  ApiServiceGroups,
  ContentListItem,
  LocalizedText,
  PublicSettings,
  SiteContent,
} from './site-content.models';

/**
 * Loads the editable corporate content from the Laravel API once at start-up.
 *
 * Every accessor takes the value currently bundled in the Angular app as its fallback, so the
 * site renders exactly as before when the API is slow, unavailable, or not called (prerender).
 */
@Injectable({ providedIn: 'root' })
export class SiteContentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly language = inject(LanguageService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly content = signal<SiteContent | null>(null);
  readonly services = signal<ApiServiceGroups | null>(null);
  readonly brands = signal<ApiBrand[] | null>(null);
  private readonly settings = signal<PublicSettings | null>(null);

  /** Requests taking longer than this fall back to the bundled content. */
  static readonly TIMEOUT_MS = 5000;

  /**
   * Resolves after loading on the server (so SSR output contains database content);
   * resolves immediately in the browser so the first paint is never delayed.
   */
  load(): Promise<void> {
    if (this.baseUrl === null) {
      return Promise.resolve();
    }

    const loaded = firstValueFrom(
      forkJoin({
        content: this.get<SiteContent>('/api/v1/sites/corporate/content'),
        services: this.get<ApiServiceGroups>('/api/v1/services'),
        brands: this.get<ApiBrand[]>('/api/v1/brands'),
        settings: this.get<PublicSettings>('/api/v1/settings'),
      }),
    ).then(({ content, services, brands, settings }) => {
      if (content) {
        this.content.set(content);
        this.language.setRemoteTranslations(content.texts);
      }
      this.services.set(services);
      this.brands.set(brands);
      this.settings.set(settings);
    });

    return isPlatformServer(this.platformId) ? loaded : Promise.resolve();
  }

  /** Picks the current language, falling back to English, then to ''. */
  pick(text: LocalizedText | null | undefined): string {
    const language = this.language.currentLanguage();
    return text?.[language] || text?.en || '';
  }

  /** URL of an editable image entry, or the bundled image the template used before. */
  image(key: string, fallback: string): string {
    const image = this.content()?.images[key];
    const url = this.language.currentLanguage() === 'ar' ? image?.url_ar || image?.url : image?.url;
    return url || fallback;
  }

  /** Items of an editable list, or null when the API content is not available. */
  list(key: string): ContentListItem[] | null {
    return this.content()?.lists[key] ?? null;
  }

  setting<T>(key: string, fallback: T): T {
    const value = this.settings()?.[key];
    return value === undefined || value === null ? fallback : (value as T);
  }

  private get<T>(path: string): Observable<T | null> {
    return this.http.get<{ data: T }>(`${this.baseUrl}${path}`).pipe(
      timeout(SiteContentService.TIMEOUT_MS),
      map((response) => response.data),
      catchError(() => of(null)),
    );
  }
}
