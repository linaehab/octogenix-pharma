import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
@Component({
  selector: 'app-company-impact',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './company-impact.html',
  styleUrl: './company-impact.css',
})
export class CompanyImpact {
  readonly routes = {
    about: '/about',
    services: '/services',
    brands: '/brands',
    contact: '/contact',
    distribution: '/distribution',
    healthcare: '/healthcare'
  };
}
