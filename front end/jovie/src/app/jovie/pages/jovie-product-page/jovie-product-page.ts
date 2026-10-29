import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { ProductAbout } from '../../components/products/product-about';
import { ProductCta } from '../../components/products/product-cta';
import { ProductHeader } from '../../components/products/product-header';
import { ProductQuotes } from '../../components/products/product-quotes';
import { PRODUCTS, ProductSlug } from '../../data/products-content';

/**
 * /jovie/products/infant-goat-milk, /follow-on-goat-milk and /toddler-goat-milk: the official
 * product pages, section by section, with the Egyptian tins.
 */
@Component({
  selector: 'app-jovie-product-page',
  imports: [ProductHeader, ProductAbout, ProductCta, ProductQuotes],
  template: `
    <app-product-header [product]="product()" />
    <app-product-about [product]="product()" />
    <app-product-cta [product]="product()" />
    <app-product-quotes />
  `,
  styles: ':host { display: block; }',
})
export class JovieProductPage {
  private readonly slug = toSignal(inject(ActivatedRoute).data.pipe(map((data) => data['product'] as ProductSlug)), {
    initialValue: PRODUCTS[0].slug,
  });

  protected readonly product = computed(() => PRODUCTS.find((product) => product.slug === this.slug()) ?? PRODUCTS[0]);
}
