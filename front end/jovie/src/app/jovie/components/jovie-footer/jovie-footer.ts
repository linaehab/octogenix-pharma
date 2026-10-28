import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { contactEmail, contactPhones } from '../../../core/content/contact-details';
import { SiteContentService } from '../../../core/content/site-content.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { JOVIE_NAV } from '../jovie-header/jovie-header';

@Component({
  selector: 'app-jovie-footer',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './jovie-footer.html',
  styleUrl: './jovie-footer.css',
})
export class JovieFooter {
  private readonly content = inject(SiteContentService);

  protected readonly pages = JOVIE_NAV;
  protected readonly phones = computed(() => contactPhones(this.content));
  protected readonly email = computed(() => contactEmail(this.content));
  protected readonly year = new Date().getFullYear();
}
