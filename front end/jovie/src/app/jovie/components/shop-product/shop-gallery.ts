import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';

export interface GalleryImage {
  src: string;
  /** Larger file for the zoom link and for wide tiles, when there is one. */
  zoom?: string;
  alt: string;
  /** A wide (2 : 1) copy of the photo for a last, single tile across the column. */
  wide?: { src: string; zoom?: string };
}

type TileSize = 'big' | 'small' | 'half' | 'wide';

/**
 * The product photos as a grid, after the kabrita.eu product page: a large square beside two small
 * squares stacked (2 : 1 columns, 6 px gaps), repeated while three photos are left. Two photos left
 * sit side by side as two squares; a single photo left is a wide, low tile across the column (its
 * 2 : 1 copy), never a large square. No photo is repeated. Each tile opens its zoom file. On phones
 * the photos become a swipeable row (one square at a time) with dots.
 */
@Component({
  selector: 'app-shop-gallery',
  template: `
    <ul #track class="grid" role="list" (scroll)="onScroll()">
      @for (tile of tiles(); track tile.image.src; let i = $index) {
        <li [class]="'tile tile--' + tile.size">
          @let file = tile.size === 'wide' && tile.image.wide ? tile.image.wide : tile.image;
          <a [href]="file.zoom ?? file.src" target="_blank" rel="noopener"
            [attr.aria-label]="zoomLabel() + ': ' + tile.image.alt">
            <img [src]="file.src" [attr.srcset]="srcset(file, tile.size === 'wide' && !!tile.image.wide)" [attr.sizes]="sizes[tile.size]"
              [alt]="tile.image.alt" width="900" height="900" [attr.loading]="i < 3 ? null : 'lazy'"
              [attr.fetchpriority]="i === 0 ? 'high' : null" decoding="async" />
          </a>
        </li>
      }
    </ul>
    @if (images().length > 1) {
      <div class="dots" role="group" [attr.aria-label]="zoomLabel()">
        @for (image of images(); track image.src; let i = $index) {
          <button type="button" [class.is-current]="i === current()" [attr.aria-current]="i === current()"
            [attr.aria-label]="image.alt" (click)="show(i)"></button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .grid {
      display: grid;
      /* Six columns: large 4 + small 2 (the 2 : 1 of kabrita), two squares 3 + 3, wide 6. */
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .tile {
      position: relative;
      overflow: hidden;
      aspect-ratio: 1;
      background: var(--tone-soft, var(--jv-panel));
    }

    .tile--big {
      grid-column: span 4;
      grid-row: span 2;
      aspect-ratio: auto;
    }

    .tile--small {
      grid-column: span 2;
    }

    .tile--half {
      grid-column: span 3;
    }

    .tile--wide {
      grid-column: 1 / -1;
      aspect-ratio: 2 / 1;
    }

    .tile a {
      position: absolute;
      inset: 0;
      cursor: zoom-in;
    }

    .tile img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .tile a:hover img {
      transform: scale(1.03);
    }

    .tile a:focus-visible {
      outline: 3px solid var(--jv-night);
      outline-offset: -3px;
    }

    .dots {
      display: none;
    }

    /* Phones: one square photo at a time, swiped sideways, with dots. */
    @media (max-width: 599px) {
      .grid {
        display: flex;
        gap: 0;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        overscroll-behavior-x: contain;
      }

      .grid::-webkit-scrollbar {
        display: none;
      }

      .tile,
      .tile--big,
      .tile--half,
      .tile--wide {
        flex: 0 0 100%;
        aspect-ratio: 1;
        scroll-snap-align: start;
      }

      .dots {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }

      .dots button {
        width: 0.6rem;
        height: 0.6rem;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(32, 53, 100, 0.25);
        cursor: pointer;
      }

      .dots button.is-current {
        background: var(--jv-night);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .tile img {
        transition: none;
      }
    }
  `,
})
export class ShopGallery {
  readonly images = input.required<GalleryImage[]>();
  readonly zoomLabel = input('');

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  /** The photo in view on phones (the dots). */
  protected readonly current = signal(0);

  /** Displayed width of each tile (the gallery column is at most about 50rem wide). */
  protected readonly sizes: Record<TileSize, string> = {
    big: '(max-width: 599px) 100vw, (max-width: 899px) 66vw, 33rem',
    small: '(max-width: 599px) 100vw, (max-width: 899px) 33vw, 17rem',
    half: '(max-width: 599px) 100vw, (max-width: 899px) 50vw, 25rem',
    wide: '(max-width: 899px) 100vw, 50rem',
  };

  /** Large + two small while three photos are left; then two squares, or one wide tile. */
  protected readonly tiles = computed(() => {
    const images = this.images();
    const tiles: { image: GalleryImage; size: TileSize }[] = [];
    let i = 0;
    while (images.length - i >= 3) {
      tiles.push({ image: images[i], size: 'big' }, { image: images[i + 1], size: 'small' }, { image: images[i + 2], size: 'small' });
      i += 3;
    }
    if (images.length - i === 2) {
      tiles.push({ image: images[i], size: 'half' }, { image: images[i + 1], size: 'half' });
    } else if (images.length - i === 1) {
      tiles.push({ image: images[i], size: 'wide' });
    }
    return tiles;
  });

  /** Square copies are 900 / 1600 px wide, wide copies 1000 / 1800 px. */
  protected srcset(image: { src: string; zoom?: string }, wide: boolean): string | null {
    const [small, large] = wide ? [1000, 1800] : [900, 1600];
    return image.zoom ? `${image.src} ${small}w, ${image.zoom} ${large}w` : null;
  }

  protected onScroll(): void {
    const el = this.track()?.nativeElement;
    if (el && el.clientWidth) {
      this.current.set(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
    }
  }

  protected show(index: number): void {
    const el = this.track()?.nativeElement;
    if (!el) {
      return;
    }
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollTo({ left: (rtl ? -1 : 1) * index * el.clientWidth, behavior: 'smooth' });
    this.current.set(index);
  }
}
