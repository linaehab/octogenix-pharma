import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { ServicesSection } from '../../components/services-section/services-section';
import { designImage } from '../../components/design-image';

@Component({
  selector: 'app-services-page',
  imports: [RouteIntro, ServicesSection, TranslatePipe],
  templateUrl: './services-page.html',
  styleUrl: './services-page.css',
})
export class ServicesPage {
  protected readonly content = inject(SiteContentService);

  /**
   * The page photograph. The warehouse photograph still set in the dashboard is a 34 MB camera
   * original, so its web-sized copy (same photograph) is shown; any other dashboard image is
   * shown as it is.
   */
  protected heroImage(): string {
    return designImage(
      this.content,
      'page.services.image',
      '/assets/images/warehouse-workers-checking-inventory-goods-distribution-large-storehouse.jpg',
      '/assets/images/corporate-v2/services-banner.webp',
    );
  }
}
