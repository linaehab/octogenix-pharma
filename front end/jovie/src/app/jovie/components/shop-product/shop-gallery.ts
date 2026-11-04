import { Component, computed, input, linkedSignal } from '@angular/core';

export interface GalleryImage {
  src: string;
  /** Larger file for the zoom link, when there is one. */
  zoom?: string;
  alt: string;
}

/**
 * Product picture with thumbnails (kabrita.eu product page): a large picture on the stage's pale
 * colour and a row of thumbnails to switch it. The large picture links to its zoom file.
 */
@Component({
  selector: 'app-shop-gallery',
  template: `
    @let current = image();
    <div class="main">
      @if (current) {
        <a [href]="current.zoom ?? current.src" target="_blank" rel="noopener" [attr.aria-label]="zoomLabel() + ': ' + current.alt">
          <img [src]="current.src" [alt]="current.alt" width="640" height="640" fetchpriority="high" />
        </a>
      }
    </div>
    <ul class="thumbs" role="list">
      @for (item of images(); track item.src; let i = $index) {
        <li>
          <button type="button" [class.is-selected]="i === index()" [attr.aria-pressed]="i === index()"
            [attr.aria-label]="item.alt" (click)="index.set(i)">
            <img [src]="item.src" alt="" width="96" height="96" loading="lazy" />
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: grid;
      gap: 0.75rem;
      min-width: 0;
    }

    .main {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      border-radius: 18px;
      background: var(--tone-soft, var(--jv-panel));
    }

    .main a {
      position: absolute;
      inset: 0;
      cursor: zoom-in;
    }

    .main img {
      position: absolute;
      inset: 7%;
      width: 86%;
      height: 86%;
      object-fit: contain;
      filter: drop-shadow(0 18px 18px rgba(32, 53, 100, 0.16));
    }

    .thumbs {
      display: flex;
      gap: 0.6rem;
      margin: 0;
      padding: 0 0 0.25rem;
      overflow-x: auto;
      overflow-y: hidden;
      list-style: none;
    }

    .thumbs button {
      display: grid;
      place-items: center;
      width: 5.25rem;
      height: 5.25rem;
      padding: 0.25rem;
      border: 2px solid transparent;
      border-radius: 12px;
      background: var(--tone-soft, var(--jv-panel));
      cursor: pointer;
    }

    .thumbs button.is-selected {
      border-color: var(--jv-night);
    }

    .thumbs img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `,
})
export class ShopGallery {
  readonly images = input.required<GalleryImage[]>();
  readonly zoomLabel = input('');

  protected readonly index = linkedSignal({ source: this.images, computation: () => 0 });
  protected readonly image = computed(() => this.images()[this.index()] ?? null);
}
