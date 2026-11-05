import { Component } from '@angular/core';
import { injectWhyContent } from './why-content';

/** The founder's quote (official quote-block): handwritten, on navy, in the official wavy shape. */
@Component({
  selector: 'app-why-quote',
  template: `
    <figure class="quote">
      <div class="jv-container inner">
        <blockquote class="jv-handwritten">{{ content().quote.text }}</blockquote>
        <figcaption><strong>{{ content().quote.author }}</strong><br />{{ content().quote.role }}</figcaption>
      </div>
    </figure>
  `,
  styles: `
    .quote { margin: 0; padding-block: clamp(4rem, 7vw, 5rem); background: var(--jv-night); color: var(--jv-white); clip-path: url(#jv-ctaBackground); }
    .inner { max-width: 40rem; text-align: center; }
    blockquote { margin: 0 0 2.5rem; font-size: var(--jv-quote); line-height: var(--jv-quote-lh); }
    figcaption { font-size: var(--jv-p); line-height: var(--jv-p-lh); }
  `,
})
export class WhyQuote {
  protected readonly content = injectWhyContent();
}
