import { Component, computed, input } from '@angular/core';

/** Official Jovie graphic elements (web copies in /assets/images/jovie/shapes/). */
export type DecorShapeName =
  | 'berry' | 'berry-leaves' | 'circle-green' | 'circle-lightblue' | 'circle-red'
  | 'circle-leaves-red-green' | 'circle-leaves-yellow-blue' | 'circle-leaves-yellow-green' | 'circle-star'
  | 'cloud-blue' | 'cloud-lightblue' | 'cloud-red'
  | 'drop-blue' | 'drop-green' | 'drop-lightblue' | 'drop-red' | 'drop-yellow'
  | 'flower' | 'heart-green' | 'heart-lightblue' | 'heart-red'
  | 'leaves-blue' | 'leaves-green' | 'leaves-lightblue' | 'mushroom' | 'ring-strawberry'
  | 'ring-blue' | 'ring-green' | 'ring-lightblue' | 'ring-red' | 'ring-yellow'
  | 'snowflake-blue' | 'snowflake-darkblue' | 'snowflake-green' | 'snowflake-lightblue' | 'snowflake-red'
  | 'striped-circle-blue' | 'striped-circle-green' | 'striped-circle-lightblue' | 'striped-circle-red'
  | 'tulips-1' | 'tulips-2';

/**
 * One official decorative element. Purely decorative (hidden from assistive technology).
 * `tone="pale"` turns it into a translucent white silhouette, used for the pattern on yellow.
 */
@Component({
  selector: 'app-decor-shape',
  template: `<img [src]="src()" alt="" loading="lazy" decoding="async" />`,
  styles: `
    :host { display: block; pointer-events: none; }
    img { display: block; width: 100%; height: auto; }
    :host(.pale) img { filter: brightness(0) invert(1); opacity: 0.28; }
  `,
  host: { 'aria-hidden': 'true', '[class.pale]': "tone() === 'pale'" },
})
export class DecorShape {
  readonly shape = input.required<DecorShapeName>();
  readonly tone = input<'colour' | 'pale'>('colour');

  protected readonly src = computed(() => `/assets/images/jovie/shapes/${this.shape()}.png`);
}
