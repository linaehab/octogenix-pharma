import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AboutSection } from '../../components/about-section/about-section';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { ValuesSection } from '../../components/values-section/values-section';
import { LeadershipSection } from '../../components/leadership-section/leadership-section';
import { QualitySection } from '../../components/quality-section/quality-section';

@Component({
  selector: 'app-about-page',
  imports: [RouteIntro, AboutSection, ValuesSection, QualitySection, LeadershipSection, TranslatePipe],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage {
  protected readonly content = inject(SiteContentService);
}
