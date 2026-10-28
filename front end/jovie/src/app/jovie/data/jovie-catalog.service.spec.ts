import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/api/api-base-url';
import { JOVIE_PREVIEW_PRODUCTS, JovieCatalogService } from './jovie-catalog.service';
import { PREVIEW_PRODUCTS } from './preview-catalog';

describe('JovieCatalogService', () => {
  let http: HttpTestingController;

  const setUp = (options: { baseUrl?: string | null; preview?: typeof PREVIEW_PRODUCTS } = {}) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: options.baseUrl === undefined ? '' : options.baseUrl },
        { provide: JOVIE_PREVIEW_PRODUCTS, useValue: options.preview ?? PREVIEW_PRODUCTS },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(JovieCatalogService);
  };

  const request = () => http.expectOne((req) => req.url === '/api/v1/products' && req.params.get('brand') === 'jovie');

  afterEach(() => http.verify());

  it('shows the API products, ordered by stage, when there are any', () => {
    const catalog = setUp();
    catalog.load();
    request().flush({ data: [PREVIEW_PRODUCTS[2], PREVIEW_PRODUCTS[0]] });

    expect(catalog.status()).toBe('ready');
    expect(catalog.isPreview()).toBe(false);
    expect(catalog.products().map((p) => p.stage)).toEqual([1, 3]);
  });

  it('falls back to the labelled preview catalogue when the API has no active product', () => {
    const catalog = setUp();
    catalog.load();
    request().flush({ data: [] });

    expect(catalog.isPreview()).toBe(true);
    expect(catalog.products().length).toBe(3);
  });

  it('shows the empty state when there is neither API data nor preview data', () => {
    const catalog = setUp({ preview: [] });
    catalog.load();
    request().flush({ data: [] });

    expect(catalog.status()).toBe('ready');
    expect(catalog.products()).toEqual([]);
    expect(catalog.isPreview()).toBe(false);
  });

  it('reports errors and can retry', () => {
    const catalog = setUp();
    catalog.load();
    request().flush('down', { status: 500, statusText: 'Server Error' });
    expect(catalog.status()).toBe('error');

    catalog.retry();
    expect(catalog.status()).toBe('loading');
    request().flush({ data: [] });
    expect(catalog.status()).toBe('ready');
  });

  it('requests the products only once', () => {
    const catalog = setUp();
    catalog.load();
    catalog.load();
    request().flush({ data: [] });
  });

  it('does not call the API while prerendering (no base URL)', () => {
    const catalog = setUp({ baseUrl: null });
    catalog.load();

    http.expectNone(() => true);
    expect(catalog.status()).toBe('loading');
  });
});
