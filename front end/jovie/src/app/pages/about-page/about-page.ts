import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AboutSection } from '../../components/about-section/about-section';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { ValuesSection } from '../../components/values-section/values-section';
import { LeadershipSection } from '../../components/leadership-section/leadership-section';
import { QualitySection } from '../../components/quality-section/quality-section';
import { designImage } from '../../components/design-image';

@Component({
  selector: 'app-about-page',
  imports: [RouteIntro, AboutSection, ValuesSection, QualitySection, LeadershipSection, TranslatePipe],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage {
  protected readonly content = inject(SiteContentService);

  /**
   * The black-and-white office photograph (reference banner style), replacing the previous site's default and the earlier upload
   * (the logo artwork); any other image chosen in the dashboard is shown as it is.
   */
  protected heroImage(): string {
    return designImage(
      this.content,
      'page.about.image',
      ['/assets/images/about us.jpg', '/storage/uploads/images/2026/11/59ec1d7a-1ee8-4343-ab3f-769d0b603929.jpg'],
      '/assets/images/corporate-v3/banner-about.webp',
    );
  }
}
