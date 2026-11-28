import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { PREVIEW_PRODUCTS } from '../../data/preview-catalog';
import { jovieTranslations } from '../../jovie-translations';
import { CartService } from '../../store/cart.service';
import { JovieShopProductPage } from './jovie-shop-product-page';

describe('JovieShopProductPage', () => {
  let http: HttpTestingController;
  const price = { amount_piastres: 50000, currency: 'EGP' };
  const product = {
    ...PREVIEW_PRODUCTS[0],
    slug: 'jovie-organic-infant-milk-stage-1',
    rating: undefined,
    price_from: price,
    is_available: true,
    variants: [{ ...PREVIEW_PRODUCTS[0].variants[0], id: 1, price, is_available: true, max_per_order: null }],
  };

  const emptyReviews = {
    data: [],
    meta: { current_page: 1, last_page: 1, total: 0, summary: { count: 0, average: null, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, recommend_percent: null } },
  };

  const render = () => {
    localStorage.removeItem('jovie.cart');
    TestBed.configureTestingModule({
      imports: [JovieShopProductPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: product.slug })) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    spyOn(TestBed.inject(SiteContentService), 'setting').and.callFake(
      ((key: string, fallback: unknown) => (key === 'store.enabled' ? true : fallback)) as never,
    );
    const fixture = TestBed.createComponent(JovieShopProductPage);
    fixture.detectChanges();
    http.expectOne('/api/v1/products?brand=jovie').flush({ data: [product] });
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  afterEach(() => {
    http.verify();
    localStorage.removeItem('jovie.cart');
  });

  it('shows the product from the API with the label panels and adds the chosen quantity to the cart', () => {
    const { fixture, element } = render();
    http.expectOne(`/api/v1/products/${product.slug}`).flush({ data: product });
    fixture.detectChanges();
    http.expectOne((req) => req.url === `/api/v1/products/${product.slug}/reviews`).flush(emptyReviews);
    fixture.detectChanges();
    // One size per product in Egypt: no size choice.
    expect(element.querySelector('.sizes')).toBeNull();

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Jovie Organic Infant Milk - Stage 1');
    expect(element.querySelector('.price')?.textContent).toContain('500');
    expect(element.querySelector('.rating small')?.textContent).toContain('Preview rating');
    // Stage 1's own photos once each, in the kabrita.eu grid: a large square beside two small ones.
    const tiles = Array.from(element.querySelectorAll('app-shop-gallery .tile'));
    expect(tiles.map((tile) => tile.querySelector('img')?.getAttribute('src'))).toEqual([
      '/assets/images/jovie/shop/product/stage-1-decorative.webp',
      '/assets/images/jovie/shop/product/stage-1-tin.webp',
      '/assets/images/jovie/shop/product/stage-1-scoop.webp',
    ]);
    expect(tiles.map((tile) => tile.className)).toEqual(['tile tile--big', 'tile tile--small', 'tile tile--small']);
    expect(tiles[0].querySelector('a')?.getAttribute('href')).toBe('/assets/images/jovie/shop/product/stage-1-decorative-zoom.webp');

    // The brand story comes right before "Why Jovie Goat".
    const story = element.querySelector('app-shop-story')!;
    expect(story.nextElementSibling?.tagName).toBe('APP-SHOP-HIGHLIGHTS');
    expect(story.querySelector('.page-title')?.textContent?.trim()).toBe("Jovie's Promise");
    expect(story.querySelector('.band--promise')?.textContent).toContain('the best choices');
    expect(story.querySelector('.goats img')?.getAttribute('src')).toBe('/assets/images/jovie/shop/product/goats-path.webp');
    expect(story.querySelector('.band--choices')?.textContent).toContain('palm oil, maltodextrin and soy');
    expect(story.querySelector('.band--choices .pattern')?.getAttribute('src')).toContain('/official/patterns/');
    expect(Array.from(story.querySelectorAll('.benefit h3'), (h) => h.textContent?.trim())).toEqual(['Full fat milk goodness', 'Organic', 'Pure & Natural']);
    expect(Array.from(story.querySelectorAll('.benefit:last-child .checks li'), (li) => li.textContent?.trim())).toEqual([
      'Without palm oil',
      'Without soy',
      'Without maltodextrin',
    ]);
    // The three illustrated points and "More about us" were removed at the client's request.
    expect(story.querySelector('.usps, .pill')).toBeNull();
    // Stops at Pure & Natural: nothing after it from the original page.
    expect(story.textContent).not.toContain('Jovie offers more');
    expect(Array.from(element.querySelectorAll('.panels details summary'), (s) => s.textContent?.trim())).toEqual([
      'Important information',
      'Description',
      'Feeding guide',
      'Ingredients',
      'Preparation and storage',
      'Nutrition',
    ]);
    expect(element.querySelectorAll('.panels details')[2].querySelectorAll('tbody tr').length).toBe(5);
    expect(element.querySelectorAll('.panels details')[3].textContent).toContain('ORGANIC whole goat milk');
    expect(element.querySelector('.crumbs')?.textContent).toContain('Shop');

    // Quantity 2, then Add to Cart.
    element.querySelector<HTMLButtonElement>('app-quantity-stepper button:last-of-type')!.click();
    fixture.detectChanges();
    const add = element.querySelector<HTMLButtonElement>('.purchase button.add')!;
    expect(add.textContent).toContain('Add to cart');
    expect(add.textContent).toContain('1,000');
    add.click();
    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const preview = http.expectOne('/api/v1/cart/preview');
    expect(preview.request.body).toEqual({ items: [{ variant_id: 1, quantity: 2 }] });
    preview.flush({ data: { items: [{ variant_id: 1, quantity: 2, is_available: true, max_quantity: 99, exceeds_available_quantity: false }], subtotal: { amount_piastres: 100000, currency: 'EGP' }, item_count: 2, has_unavailable_items: false } });
    fixture.detectChanges();

    expect(TestBed.inject(CartService).count()).toBe(2);
    expect(element.querySelector('#pdp-status')?.textContent).toContain('2 added to your cart.');
  });

  it('says when the product is not on sale', () => {
    const { fixture, element } = render();
    http.expectOne(`/api/v1/products/${product.slug}`).flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(element.querySelector('h1')?.textContent).toContain('not available');
  });
});
