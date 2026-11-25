import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecorShape, type DecorShapeName } from '../../components/decor-shape/decor-shape';
import { PageIntro } from '../../components/page-intro/page-intro';
import { fill, injectProductsContent } from '../../components/products/products-content';
import { PRODUCTS, type ProductTone, productImage, productLink } from '../../data/products-content';
import { ProductsAbout } from '../../components/products/products-about';
import { ProductsPros } from '../../components/products/products-pros';

/**
 * /jovieEgypt/products: the official "Discover All Our Products" page. The official sideways-scrolling
 * track is replaced, at the client's request, by the three products one below the other: the
 * Egyptian tin in the product's colour blob beside its name, label details and "More Details".
 */
/**
 * The Jovie graphics in each product's white space: two official page-header pattern shapes in the
 * product's colour (faint) and two official coloured elements. Mirrored on every other product.
 */
const PRODUCT_DECOR: Record<ProductTone, { patterns: [string, string]; shapes: [DecorShapeName, DecorShapeName] }> = {
  yellow: { patterns: ['header-1', 'faq-5'], shapes: ['leaves-lightblue', 'striped-circle-red'] },
  pink: { patterns: ['header-3', 'header-5'], shapes: ['heart-red', 'leaves-green'] },
  blue: { patterns: ['header-2', 'faq-6'], shapes: ['cloud-blue', 'ring-yellow'] },
};

const patternUrl = (name: string) => `url(/assets/images/jovie/official/patterns/${name}.svg)`;

@Component({
  selector: 'app-jovie-products-page',
  imports: [PageIntro, RouterLink, ProductsPros, ProductsAbout, DecorShape],
  templateUrl: './jovie-products-page.html',
  styleUrl: './jovie-products-page.css',
})
export class JovieProductsPage {
  protected readonly content = injectProductsContent();
  protected readonly products = PRODUCTS;
  protected readonly image = productImage;
  protected readonly link = productLink;
  protected readonly fill = fill;
  protected readonly decor = PRODUCT_DECOR;
  protected readonly patternUrl = patternUrl;
}
