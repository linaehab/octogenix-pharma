import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { PRODUCT_STORY } from '../../data/product-story';

/**
 * The official "Jovie's Promise" page (jovieproducts.eu/en/pages/jovies-promise) up to
 * "Pure & Natural", between the product and "Why Jovie Goat" on the shop product page: the page
 * title, the promise on grey with the yellow heart, the goats across the page, "Say YES / Say NO"
 * on grey with the pale decoration, then on white "Full fat milk goodness" (left, pink heart),
 * "Organic" (right, green heart) and "Pure & Natural" (left, yellow heart, red check marks).
 *
 * Sizes, spacing and the hearts' places follow the original stylesheets (rich-text, illustrations,
 * section-jovie-image). The hearts are the project's official heart shape (shapes/heart-*.png) in the
 * original colours; the pale decoration is the project's official Jovie pattern
 * (official/patterns/*.svg) toned to the original light grey.
 */
@Component({
  selector: 'app-shop-story',
  template: `
    <section class="story" aria-labelledby="pdp-promise">
      <h2 id="pdp-promise" class="page-title">{{ text().title }}</h2>

      <div class="band band--promise">
        <span class="heart heart--yellow heart--promise" aria-hidden="true"></span>
        <p class="statement">
          @for (part of text().promise; track $index) {
            @if (part.strong) {<strong>{{ part.text }}</strong>} @else {<span>{{ part.text }}</span>}
          }
        </p>
      </div>

      <figure class="goats">
        <img src="/assets/images/jovie/shop/product/goats-path.webp"
          srcset="/assets/images/jovie/shop/product/goats-path-1200.webp 1200w, /assets/images/jovie/shop/product/goats-path.webp 2400w"
          sizes="100vw" [alt]="text().goatsAlt" width="2400" height="1600" loading="lazy" decoding="async" />
      </figure>

      <div class="band band--choices">
        <img class="pattern pattern--cloud" src="/assets/images/jovie/official/patterns/header-1.svg" alt="" aria-hidden="true" />
        <img class="pattern pattern--flower" src="/assets/images/jovie/official/patterns/contact-4.svg" alt="" aria-hidden="true" />
        <p class="statement">
          @for (part of text().sayYes; track $index) {
            @if (part.strong) {<strong>{{ part.text }}</strong>} @else {<span>{{ part.text }}</span>}
          }
          <br />
          @for (part of text().sayNo; track $index) {
            @if (part.strong) {<strong>{{ part.text }}</strong>} @else {<span>{{ part.text }}</span>}
          }
        </p>
      </div>

      <div class="benefits">
        <img class="pattern pattern--white-a" src="/assets/images/jovie/official/patterns/header-4.svg" alt="" aria-hidden="true" />
        <img class="pattern pattern--white-b" src="/assets/images/jovie/official/patterns/header-5.svg" alt="" aria-hidden="true" />
        @for (item of text().benefits; track item.title; let odd = $odd) {
          <article class="benefit" [class.benefit--end]="odd" [attr.data-heart]="item.heart">
            <span class="heart" [class.heart--pink]="item.heart === 'pink'" [class.heart--green]="item.heart === 'green'"
              [class.heart--yellow]="item.heart === 'yellow'" aria-hidden="true"></span>
            <h3>{{ item.title }}</h3>
            <div class="text">
              @if (item.lead) {
                <p><strong>{{ item.lead }}</strong></p>
              }
              @for (paragraph of item.paragraphs; track $index; let last = $last) {
                <p>
                  {{ paragraph }}
                  @if (last && item.closing; as closing) {
                    <br />
                    @for (part of closing; track $index) {
                      @if (part.strong) {<strong>{{ part.text }}</strong>} @else {<span>{{ part.text }}</span>}
                    }
                  }
                </p>
              }
              @if (item.checks; as checks) {
                <ul class="checks">
                  @for (check of checks; track check) {
                    <li>{{ check }}</li>
                  }
                </ul>
              }
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styleUrl: './shop-story.css',
})
export class ShopStory {
  private readonly language = inject(LanguageService);
  protected readonly text = computed(() => PRODUCT_STORY[this.language.currentLanguage()]);
}
