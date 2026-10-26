import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api-base-url';
import { LanguageService } from '../i18n/language.service';
import { SiteContentService } from './site-content.service';
import { SiteContent } from './site-content.models';

describe('SiteContentService', () => {
  let service: SiteContentService;
  let language: LanguageService;
  let http: HttpTestingController;

  const content: SiteContent = {
    texts: { 'hero.titleFirst': { en: 'Edited title', ar: 'عنوان معدل' }, 'hero.cta': { en: 'Only English', ar: null } },
    images: { 'quality.image': { url: 'http://api.test/storage/q.jpg', url_ar: 'http://api.test/storage/q-ar.jpg' } },
    lists: { 'about.leadership': [] },
  };

  const setUp = (baseUrl: string | null = '') => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_BASE_URL, useValue: baseUrl }],
    });
    service = TestBed.inject(SiteContentService);
    language = TestBed.inject(LanguageService);
    http = TestBed.inject(HttpTestingController);
    language.setLanguage('en');
  };

  const flushAll = (overrides: Partial<Record<string, unknown>> = {}) => {
    http.expectOne('/api/v1/sites/corporate/content').flush({ data: overrides['content'] ?? content });
    http.expectOne('/api/v1/services').flush({ data: { customers: [], suppliers: [] } });
    http.expectOne('/api/v1/brands').flush({ data: [] });
    http.expectOne('/api/v1/settings').flush({ data: { 'contact.email': 'sales@example.com' } });
  };

  /** In the browser load() does not wait for the responses; let them apply. */
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  afterEach(() => http.verify());

  it('uses bundled content before anything is loaded', () => {
    setUp();

    expect(language.translate('hero.titleFirst')).toBe('Trusted Pharmaceutical');
    expect(service.image('quality.image', '/assets/fallback.jpg')).toBe('/assets/fallback.jpg');
    expect(service.list('about.leadership')).toBeNull();
    expect(service.setting('contact.email', 'fallback@example.com')).toBe('fallback@example.com');
  });

  it('applies loaded texts, images, lists and settings over the bundled content', async () => {
    setUp();
    language.setLanguage('ar');
    const bundledArabicCta = language.translate('hero.cta');
    language.setLanguage('en');

    await service.load();
    flushAll();
    await settle();

    expect(language.translate('hero.titleFirst')).toBe('Edited title');
    expect(service.image('quality.image', '/assets/fallback.jpg')).toBe('http://api.test/storage/q.jpg');
    expect(service.list('about.leadership')).toEqual([]);
    expect(service.setting('contact.email', 'fallback@example.com')).toBe('sales@example.com');

    language.setLanguage('ar');
    expect(language.translate('hero.titleFirst')).toBe('عنوان معدل');
    expect(service.image('quality.image', '/assets/fallback.jpg')).toBe('http://api.test/storage/q-ar.jpg');
    // A missing remote value for a language falls back to the bundled translation.
    expect(language.translate('hero.cta')).toBe(bundledArabicCta);
  });

  it('keeps the bundled content when the API fails', async () => {
    setUp();
    await service.load();
    http.expectOne('/api/v1/sites/corporate/content').flush('down', { status: 500, statusText: 'Server Error' });
    http.expectOne('/api/v1/services').error(new ProgressEvent('error'));
    http.expectOne('/api/v1/brands').flush({ data: [] });
    http.expectOne('/api/v1/settings').flush({ data: {} });
    await settle();

    expect(language.translate('hero.titleFirst')).toBe('Trusted Pharmaceutical');
    expect(service.services()).toBeNull();
    expect(service.brands()).toEqual([]);
  });

  it('does not call the API when no base URL is configured (prerendering)', async () => {
    setUp(null);
    await service.load();

    http.expectNone(() => true);
    expect(language.translate('hero.titleFirst')).toBe('Trusted Pharmaceutical');
  });

  it('picks the current language with English as fallback', () => {
    setUp();

    expect(service.pick({ en: 'Hello', ar: 'مرحبا' })).toBe('Hello');
    language.setLanguage('ar');
    expect(service.pick({ en: 'Hello', ar: 'مرحبا' })).toBe('مرحبا');
    expect(service.pick({ en: 'Hello', ar: null })).toBe('Hello');
    expect(service.pick(undefined)).toBe('');
  });
});
