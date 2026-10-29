import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageIntro } from '../../components/page-intro/page-intro';
import { fill, injectProductsContent } from '../../components/products/products-content';
import { PRODUCTS, productImage, productLink } from '../../data/products-content';

/**
 * /jovie/products: the official "Discover All Our Products" page. The official sideways-scrolling
 * track is replaced, at the client's request, by the three products one below the other: the
 * Egyptian tin in the product's colour blob beside its name, label details and "More Details".
 */
@Component({
  selector: 'app-jovie-products-page',
  imports: [PageIntro, RouterLink],
  templateUrl: './jovie-products-page.html',
  styleUrl: './jovie-products-page.css',
})
export class JovieProductsPage {
  protected readonly content = injectProductsContent();
  protected readonly products = PRODUCTS;
  protected readonly image = productImage;
  protected readonly link = productLink;
  protected readonly fill = fill;
}
