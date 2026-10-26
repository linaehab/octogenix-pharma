import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BrandsSection } from '../../components/brands-section/brands-section';
import { RouteIntro } from '../../components/route-intro/route-intro';

@Component({
  selector: 'app-brands-page',
  imports: [RouteIntro, BrandsSection, TranslatePipe],
  templateUrl: './brands-page.html',
  styleUrl: './brands-page.css',
})
export class BrandsPage {
  protected readonly content = inject(SiteContentService);
}
