import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Official logos bundled in the project, by brand slug. */
const BRAND_LOGOS: Record<string, string> = { jovie: '/assets/images/jovie/logo-official-yellow.png' };

/**
 * Home: the reference's partner logo row, showing the company's own brands (logo tiles that open
 * the brands page) with the reference's small progress bar beneath.
 */
@Component({
  selector: 'app-home-partners',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="partners section-wrap" aria-labelledby="partners-title">
      <h2 id="partners-title">{{ 'brands.kicker' | translate }}</h2>
      <div class="partner-row">
        @for (brand of brands(); track brand.name) {
          <a class="partner-tile" routerLink="/brands" [attr.aria-label]="brand.name">
            @if (brand.logo) {
              <img [src]="brand.logo" [alt]="brand.name" loading="lazy" />
            } @else {
              <span>{{ brand.name }}</span>
            }
          </a>
        }
      </div>
      <span class="partner-progress" aria-hidden="true"><span></span></span>
    </section>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
    }

    .partners {
      padding-block: var(--cx-section);
    }

    h2 {
      margin: 0 0 28px;
      text-align: center;
      font-size: clamp(26px, 2.6vw, 34px);
    }

    .partner-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 280px));
      justify-content: center;
      gap: 16px;
    }

    .partner-tile {
      display: grid;
      height: 120px;
      place-items: center;
      border-radius: var(--cx-radius);
      background: var(--cx-cloud);
      transition: background 300ms ease;
    }

    .partner-tile:hover {
      background: #eff1f3;
    }

    .partner-tile img {
      width: auto;
      height: 76px;
    }

    .partner-tile span {
      color: var(--cx-ink);
      font-size: 22px;
      font-weight: 600;
    }

    .partner-progress {
      display: block;
      width: 210px;
      height: 4px;
      margin: 32px auto 0;
      border-radius: 2px;
      background: var(--cx-line);
    }

    .partner-progress span {
      display: block;
      width: 33%;
      height: 100%;
      border-radius: 2px;
      background: var(--cx-azure);
    }
  `,
})
export class HomePartners {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  protected readonly brands = computed(() => {
    const remote = this.content.brands();
    if (remote?.length) {
      return remote.map((brand) => ({
        name: this.content.pick(brand.name),
        logo: BRAND_LOGOS[brand.slug] ?? brand.logo_url ?? null,
      }));
    }
    return [{ name: this.language.translate('brands.jovie'), logo: BRAND_LOGOS['jovie'] }];
  });
}
