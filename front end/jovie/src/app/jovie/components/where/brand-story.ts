import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { BRAND_STORY } from '../../data/brand-story';

/**
 * The "Joie de vivre" band and "A Brand from Dutch origin", after the official "We are Jovie" page:
 * sky blue band with the flower illustration, logo, text and button; then the white section with
 * the map of the Netherlands behind it. Phones get the official short text and no logo or flowers.
 */
@Component({
  selector: 'app-brand-story',
  imports: [RouterLink],
  template: `
    <section class="joy" aria-labelledby="brand-joy-title">
      <img class="flowers" src="/assets/images/jovie/family/flowers.svg" alt="" width="63" height="69" aria-hidden="true" />
      <div class="container">
        <h2 id="brand-joy-title" class="visually-hidden">{{ text().joy.logo }}</h2>
        <img class="logo" src="/assets/images/jovie/logo-official-yellow-border.png" alt="" width="175" height="175" />
        <p class="text">
          @for (line of text().joy.lines; track $index) {
            @if (!$first) {
              <br />
            }
            {{ line }}
          }
        </p>
        <p class="text closing">{{ text().joy.closing }}</p>
        <p class="mobile">{{ text().joy.mobile }}</p>
        <p class="buttons"><a class="pill" routerLink="/jovie/why">{{ text().joy.button }}</a></p>
      </div>
    </section>

    <section class="origin" aria-labelledby="brand-origin-title">
      <img class="map" src="/assets/images/jovie/brand/netherlands-map.svg" alt="" width="709" height="840" aria-hidden="true" />
      <div class="container">
        <h2 id="brand-origin-title"><strong>{{ text().origin.titleLines[0] }}<br />{{ text().origin.titleLines[1] }}</strong></h2>
        <p>{{ text().origin.text }}</p>
        <p><strong>{{ text().origin.strong }}</strong></p>
      </div>
    </section>
  `,
  styleUrl: './brand-story.css',
})
export class BrandStory {
  private readonly language = inject(LanguageService);
  protected readonly text = computed(() => BRAND_STORY[this.language.currentLanguage()]);
}
