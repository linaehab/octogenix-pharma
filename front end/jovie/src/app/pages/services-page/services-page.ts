import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { ServicesSection } from '../../components/services-section/services-section';

@Component({
  selector: 'app-services-page',
  imports: [RouteIntro, ServicesSection, TranslatePipe],
  templateUrl: './services-page.html',
  styleUrl: './services-page.css',
})
export class ServicesPage {
  protected readonly content = inject(SiteContentService);

  /** Banner photograph (black and white, reference banner style); editable in the dashboard. */
  protected heroImage(): string {
    return this.content.image('page.services.image', '/assets/images/corporate-v3/banner-services.webp');
  }
}
