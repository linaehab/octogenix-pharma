import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

interface BrandCard {
  name: string;
  label: string;
  description: string;
  /** The brand logo, shown in a white tile (reference partner-logo style). */
  logo: string | null;
  /** A brand photograph, shown when the brand has no logo. */
  image: string | null;
  imageAlt: string;
  ctaLabel: string;
  link: { type: 'none' | 'internal' | 'external'; url: string | null };
  /** Route of the brand's own store in this app, when it has one. */
  storeUrl: string | null;
}

/** Brand stores that exist in this Angular app (has_store only says the brand sells online). */
const BRAND_STORE_ROUTES: Record<string, string> = { jovie: '/jovie' };

/** The official Jovie logo: the bundled card shown until the dashboard brands load. */
const JOVIE_LOGO = '/assets/images/jovie/logo-official-yellow.png';

@Component({
  selector: 'app-brands-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './brands-section.html',
  styleUrl: './brands-section.css',
})
export class BrandsSection {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  /** Active brands from the dashboard, or the bundled Jovie card when the API is unavailable. */
  protected readonly brands = computed<BrandCard[]>(() => {
    const remote = this.content.brands();
    if (remote) {
      return remote.map((brand) => ({
        name: this.content.pick(brand.name),
        label: this.content.pick(brand.label),
        description: this.content.pick(brand.short_description),
        logo: brand.logo_url,
        image: brand.image_url,
        imageAlt: this.content.pick(brand.image_alt),
        ctaLabel: this.content.pick(brand.cta_label),
        link: brand.link,
        storeUrl: brand.has_store ? (BRAND_STORE_ROUTES[brand.slug] ?? null) : null,
      }));
    }

    const t = (key: string) => this.language.translate(key);
    return [{
      name: t('brands.jovie'),
      label: '',
      description: '',
      logo: JOVIE_LOGO,
      image: null,
      imageAlt: '',
      ctaLabel: t('brands.cta'),
      link: { type: 'internal', url: '/contact' },
      storeUrl: BRAND_STORE_ROUTES['jovie'],
    }];
  });
}
