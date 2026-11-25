import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Official logos bundled in the project (white versions, for the charcoal panel), by brand slug. */
const BRAND_LOGOS: Record<string, string> = { jovie: '/assets/images/jovie/logo-official-white.png' };

/** Brands with their own store on this site, by slug. */
const BRAND_STORES: Record<string, string> = { jovie: '/jovieEgypt' };

/**
 * Home, under the hero: the company's brands in a split card — the brands text and links on light
 * grey, and the official brand logos in white on a plain charcoal panel.
 */
@Component({
  selector: 'app-home-partners',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="brands-home section-wrap" aria-labelledby="partners-title">
      <div class="brands-card">
        <div class="brands-copy">
          <p class="eyebrow"><span></span>{{ 'brands.kicker' | translate }}</p>
          <h2 id="partners-title">{{ 'brands.title' | translate }}</h2>
          <p class="brands-text">{{ 'page.brands.description' | translate }}</p>
          <div class="brands-actions">
            <a class="button button-azure" routerLink="/brands">
              {{ 'header.brands' | translate }} <span aria-hidden="true">↗</span>
            </a>
            @if (store(); as s) {
              <a class="text-link" [routerLink]="s.url">
                {{ 'brands.visitWebsite' | translate: { brand: s.name } }} <span aria-hidden="true">→</span>
              </a>
            }
          </div>
        </div>
        <div class="brands-panel">
          @for (brand of brands(); track brand.name) {
            <a class="brand-mark" routerLink="/brands" [attr.aria-label]="brand.name">
              @if (brand.logo) {
                <img [src]="brand.logo" [alt]="brand.name" loading="lazy" />
              } @else {
                <span>{{ brand.name }}</span>
              }
            </a>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      background: #fff;
    }

    .brands-home {
      padding-block: clamp(40px, 5vw, 64px) 0;
    }

    .brands-card {
      display: grid;
      grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
      overflow: hidden;
      border-radius: var(--cx-radius-lg);
      background: var(--cx-cloud);
    }

    .brands-copy {
      align-self: center;
      padding: clamp(32px, 4.4vw, 60px);
    }

    h2 {
      margin: 16px 0 14px;
      font-size: clamp(26px, 2.6vw, 36px);
      line-height: 1.15;
    }

    .brands-text {
      max-width: 480px;
      margin: 0;
      color: var(--cx-slate);
      font-size: 15px;
      line-height: 1.7;
    }

    .brands-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 18px 28px;
      margin-top: 28px;
    }

    /* Charcoal panel, soft light from the centre, the logo in white with a thin lime rule */
    .brands-panel {
      display: grid;
      min-height: 320px;
      align-content: center;
      justify-items: center;
      gap: 28px;
      padding: clamp(28px, 3.4vw, 48px);
      background: radial-gradient(circle at 50% 45%, #45474a 0%, var(--cx-navy) 62%);
    }

    .brand-mark {
      display: grid;
      justify-items: center;
      gap: 22px;
    }

    .brand-mark::after {
      width: 44px;
      height: 2px;
      border-radius: 2px;
      background: var(--cx-azure);
      content: '';
      transition: width 420ms var(--cx-ease);
    }

    .brand-mark:hover::after {
      width: 88px;
    }

    .brand-mark img {
      display: block;
      width: 150px;
      height: 150px;
      object-fit: contain;
      transition: transform 420ms var(--cx-ease);
    }

    .brand-mark:hover img {
      transform: scale(1.04);
    }

    .brand-mark span {
      color: #fff;
      font-size: 30px;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      .brands-card {
        grid-template-columns: minmax(0, 1fr);
      }

      .brands-panel {
        min-height: 240px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .brand-mark img,
      .brand-mark::after {
        transition: none;
      }
    }
  `,
})
export class HomePartners {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  private readonly entries = computed(() => {
    const remote = this.content.brands();
    if (remote?.length) {
      return remote.map((brand) => ({
        slug: brand.slug,
        name: this.content.pick(brand.name),
        logo: BRAND_LOGOS[brand.slug] ?? brand.logo_url ?? null,
      }));
    }
    return [{ slug: 'jovie', name: this.language.translate('brands.jovie'), logo: BRAND_LOGOS['jovie'] }];
  });

  protected readonly brands = computed(() => this.entries().map(({ name, logo }) => ({ name, logo })));

  /** The first brand that has its own store on this site. */
  protected readonly store = computed(() => {
    const brand = this.entries().find((entry) => BRAND_STORES[entry.slug]);
    return brand ? { name: brand.name, url: BRAND_STORES[brand.slug] } : null;
  });
}
