import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ContactSection } from '../../components/contact-section/contact-section';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { designImage } from '../../components/design-image';

@Component({
  selector: 'app-contact-page',
  imports: [RouteIntro, ContactSection, TranslatePipe],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.css',
})
export class ContactPage {
  protected readonly content = inject(SiteContentService);

  /** The office photograph, unless an image was uploaded for this page in the dashboard. */
  protected heroImage(): string {
    return designImage(
      this.content,
      'page.contact.image',
      '/assets/images/contact-register-feedback-support-help-concept.jpg',
      '/assets/images/corporate-v2/contact-office.jpg',
    );
  }
}
