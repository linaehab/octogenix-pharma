import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
@Component({
  selector: 'app-company-impact',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './company-impact.html',
  styleUrl: './company-impact.css',
})
export class CompanyImpact {
  protected readonly content = inject(SiteContentService);

  readonly routes = {
    about: '/about',
    services: '/services',
    brands: '/brands',
    contact: '/contact',
    distribution: '/distribution',
    healthcare: '/healthcare'
  };
}
