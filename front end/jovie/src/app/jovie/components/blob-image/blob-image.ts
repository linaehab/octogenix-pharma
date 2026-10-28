import { Component, input } from '@angular/core';

/** A photo cropped to one of the brand's imperfect round shapes. */
@Component({
  selector: 'app-blob-image',
  template: `<img [src]="src()" [alt]="alt()" [attr.loading]="eager() ? null : 'lazy'" [attr.fetchpriority]="eager() ? 'high' : null" />`,
  styles: `
    :host { display: block; aspect-ratio: var(--blob-ratio, 1); overflow: hidden; border-radius: 58% 42% 52% 48% / 48% 56% 44% 52%; }
    :host(.blob-2) { border-radius: 44% 56% 40% 60% / 58% 44% 56% 42%; }
    :host(.blob-3) { border-radius: 52% 48% 62% 38% / 42% 58% 42% 58%; }
    img { display: block; width: 100%; height: 100%; object-fit: cover; }
  `,
})
export class BlobImage {
  readonly src = input.required<string>();
  /** Empty for decorative photos. */
  readonly alt = input('');
  /** Above-the-fold images load immediately. */
  readonly eager = input(false);
}
