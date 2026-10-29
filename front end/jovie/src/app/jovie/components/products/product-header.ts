import { Component, ElementRef, computed, input, linkedSignal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCTS, PRODUCT_VIEWS, ProductInfo, ProductView, productImage, productLink } from '../../data/products-content';
import { fill, injectProductsContent } from './products-content';

type SlidePosition = 'active' | 'next' | 'previous' | 'hidden';

/**
 * Header of a product page, after the official product-header: the product's colour band with the
 * previous / next product, the tin in four views (front, right, left, back) with the neighbours
 * peeking in, a view switcher, "Where to find" and a zoom. The tins are the Egyptian packaging.
 */
@Component({
  selector: 'app-product-header',
  imports: [RouterLink],
  templateUrl: './product-header.html',
  styleUrl: './product-header.css',
})
export class ProductHeader {
  readonly product = input.required<ProductInfo>();

  protected readonly content = injectProductsContent();
  protected readonly views = PRODUCT_VIEWS;
  protected readonly text = computed(() => this.content().products[this.product().slug]);
  /** Back to the front view whenever another product opens. */
  protected readonly active = linkedSignal({ source: this.product, computation: () => 0 });

  private readonly zoomDialog = viewChild.required<ElementRef<HTMLDialogElement>>('zoom');

  protected readonly siblings = computed(() => {
    const index = PRODUCTS.indexOf(this.product());
    const at = (offset: number) => PRODUCTS[(index + offset + PRODUCTS.length) % PRODUCTS.length];
    const name = (product: ProductInfo) => this.content().products[product.slug].name;
    return {
      previous: { link: productLink(at(-1).slug), label: fill(this.content().detail.previousProduct, { name: name(at(-1)) }) },
      next: { link: productLink(at(1).slug), label: fill(this.content().detail.nextProduct, { name: name(at(1)) }) },
    };
  });

  protected readonly activeView = computed(() => this.views[this.active()]);

  protected image(view: ProductView, zoom = false): string {
    return productImage(this.product().stage, view, zoom);
  }

  protected alt(view: ProductView): string {
    const detail = this.content().detail;
    return fill(detail.imageAlt, { name: this.text().name, view: detail.views[view] });
  }

  protected position(index: number): SlidePosition {
    const offset = (index - this.active() + this.views.length) % this.views.length;
    return offset === 0 ? 'active' : offset === 1 ? 'next' : offset === this.views.length - 1 ? 'previous' : 'hidden';
  }

  protected show(step: number): void {
    this.active.update((index) => (index + step + this.views.length) % this.views.length);
  }

  protected openZoom(): void {
    this.zoomDialog().nativeElement.showModal();
  }

  protected closeZoom(): void {
    this.zoomDialog().nativeElement.close();
  }

  /** A click on the dimmed backdrop (the dialog element itself) closes the zoom. */
  protected onZoomClick(event: MouseEvent): void {
    if (event.target === this.zoomDialog().nativeElement) {
      this.closeZoom();
    }
  }
}
