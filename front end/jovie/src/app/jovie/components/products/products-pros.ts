import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { BRAND_SECTIONS } from '../../data/brand-sections';

/**
 * "Jovie Goat Organic baby formula — Naturally good, enriched with love", after section-jovie-pros
 * of jovieproducts.eu: the tin with the official decoration (cloud, snowflake, rings), the heart
 * and check lists, the Jovie logo on wide screens and the "Jovie's Promise" button. The official
 * picture shows the Dutch 800 g tin, which is not sold in Egypt, so the Egyptian Stage 2 tin is
 * used inside the same decoration.
 */
@Component({
  selector: 'app-products-pros',
  imports: [RouterLink],
  template: `
    <section class="pros" aria-labelledby="products-pros-title">
      <div class="container">
        <img class="logo" src="/assets/images/jovie/logo-official-yellow.png" alt="" width="128" height="128" aria-hidden="true" />
        <h2 id="products-pros-title">{{ text().title }}<br /><strong>{{ text().titleStrong }}</strong></h2>
        <div class="grid">
          <figure class="pack" aria-hidden="true">
            <img class="shape cloud" src="/assets/images/jovie/shapes/cloud-lightblue.png" alt="" width="400" height="319" loading="lazy" />
            <img class="shape snow" src="/assets/images/jovie/shapes/snowflake-darkblue.png" alt="" width="377" height="400" loading="lazy" />
            <img class="shape ring" src="/assets/images/jovie/shapes/ring-yellow.png" alt="" width="400" height="367" loading="lazy" />
            <img class="tin" src="/assets/images/jovie/products/eg-stage-2-front.webp" alt="" width="640" height="867" loading="lazy" />
            <img class="shape dot" src="/assets/images/jovie/shapes/ring-red.png" alt="" width="400" height="367" loading="lazy" />
          </figure>
          <div class="lists">
            <ul class="hearts">
              @for (item of text().hearts; track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <ul class="checks">
              @for (item of text().checks; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          </div>
        </div>
        <p class="buttons"><a class="pill" routerLink="/jovie/why/without-promise">{{ text().button }}</a></p>
      </div>
    </section>
  `,
  styleUrl: './products-pros.css',
})
export class ProductsPros {
  private readonly language = inject(LanguageService);
  protected readonly text = computed(() => BRAND_SECTIONS[this.language.currentLanguage()].pros);
}
