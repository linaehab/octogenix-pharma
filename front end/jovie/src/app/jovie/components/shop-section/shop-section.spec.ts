import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { JOVIE_PREVIEW_PRODUCTS } from '../../data/jovie-catalog.service';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { jovieTranslations } from '../../jovie-translations';
import { ShopSection } from './shop-section';

describe('ShopSection', () => {
  let http: HttpTestingController;

  const render = (preview = PREVIEW_PRODUCTS) => {
    TestBed.configureTestingModule({
      imports: [ShopSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: JOVIE_PREVIEW_PRODUCTS, useValue: preview }],
    });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(ShopSection);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  const flush = (body: object | string, init?: { status: number; statusText: string }) =>
    http.expectOne((req) => req.url === '/api/v1/products').flush(body, init);

  afterEach(() => http.verify());

  it('shows skeleton cards while loading', () => {
    const { element } = render();

    expect(element.querySelectorAll('.skeleton').length).toBe(3);
    flush({ data: [] });
  });

  it('shows the three preview products with labelled prices and a disabled Add to cart', () => {
    const { fixture, element } = render();
    flush({ data: [] });
    fixture.detectChanges();

    const cards = element.querySelectorAll('app-product-card');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Stage 1 · 0–6 months');
    expect(cards[0].textContent).toContain('EGP');
    expect(cards[0].textContent).toContain('Preview price for display only');
    element.querySelectorAll<HTMLButtonElement>('app-product-card button').forEach((button) => {
      expect(button.disabled).toBe(true);
    });
  });

  it('shows real API products without the preview label', () => {
    const { fixture, element } = render();
    flush({ data: [{ ...PREVIEW_PRODUCTS[1], price_from: null }] });
    fixture.detectChanges();

    expect(element.querySelectorAll('app-product-card').length).toBe(1);
    expect(element.textContent).toContain('Price coming soon');
    expect(element.textContent).not.toContain('Preview price');
  });

  it('shows an error with a retry button', () => {
    const { fixture, element } = render();
    flush('down', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('could not load');
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.skeleton').length).toBe(3);
    flush({ data: [] });
  });

  it('shows the empty state when there are no products to show', () => {
    const { fixture, element } = render([]);
    flush({ data: [] });
    fixture.detectChanges();

    expect(element.textContent).toContain('Jovie products will be available here soon.');
  });
});
