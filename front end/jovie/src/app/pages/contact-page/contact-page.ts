import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ContactSection } from '../../components/contact-section/contact-section';
import { ContactMap } from '../../components/contact-map/contact-map';
import { RouteIntro } from '../../components/route-intro/route-intro';

@Component({
  selector: 'app-contact-page',
  imports: [RouteIntro, ContactSection, ContactMap, TranslatePipe],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css',
})
export class ContactPage {
  protected readonly content = inject(SiteContentService);

  /** Banner photograph (black and white, reference banner style); editable in the dashboard. */
  protected heroImage(): string {
    return this.content.image('page.contact.image', '/assets/images/corporate-v3/banner-contact.webp');
  }
}
