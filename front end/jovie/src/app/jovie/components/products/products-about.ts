import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { BRAND_SECTIONS } from '../../data/brand-sections';

/**
 * "We are Jovie", after section-jovie-about of jovieproducts.eu (without its heading and team photo,
 * removed at the client's request): the paragraph and
 * the three illustrated points (bottle, the Netherlands, goat) on tablets and wider, the short
 * "goat milk makes good sense" line on phones, and the "More about us" button.
 */
@Component({
  selector: 'app-products-about',
  imports: [RouterLink],
  template: `
    <!-- The "We are Jovie" heading and the team photo were removed at the client's request. -->
    <section class="about" [attr.aria-label]="text().title">
      <div class="container">
        <p class="text">{{ text().text }}</p>
        <p class="mobile-text">{{ text().mobileText }}</p>
        <ul class="usps">
          @for (usp of text().usps; track usp.image) {
            <li>
              <img [src]="'/assets/images/jovie/brand/' + usp.image" alt="" [width]="usp.width" [height]="usp.height" loading="lazy" />
              <h3>{{ usp.title }}</h3>
            </li>
          }
        </ul>
        <p class="buttons"><a class="pill" routerLink="/jovieEgypt/why">{{ text().button }}</a></p>
      </div>
    </section>
  `,
  styleUrl: './products-about.css',
})
export class ProductsAbout {
  private readonly language = inject(LanguageService);
  protected readonly text = computed(() => BRAND_SECTIONS[this.language.currentLanguage()].about);
}
