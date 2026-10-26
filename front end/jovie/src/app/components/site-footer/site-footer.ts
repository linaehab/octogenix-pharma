import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { contactEmail, contactPhones } from '../../core/content/contact-details';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css',
})
export class SiteFooter {
  private readonly content = inject(SiteContentService);

  protected readonly currentYear = new Date().getFullYear();
  protected readonly phones = computed(() => contactPhones(this.content));
  protected readonly email = computed(() => contactEmail(this.content));
}
