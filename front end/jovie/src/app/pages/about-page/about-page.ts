import { Component, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AboutSection } from '../../components/about-section/about-section';
import { RouteIntro } from '../../components/route-intro/route-intro';
import { ValuesSection } from '../../components/values-section/values-section';
import { LeadershipSection } from '../../components/leadership-section/leadership-section';
import { QualitySection } from '../../components/quality-section/quality-section';
import { GlobalBridge } from '../../components/global-bridge/global-bridge';
import { MarketReach } from '../../components/market-reach/market-reach';
import { FocusAreas } from '../../components/focus-areas/focus-areas';
import { JourneyTimeline } from '../../components/journey-timeline/journey-timeline';

@Component({
  selector: 'app-about-page',
  imports: [RouteIntro, AboutSection, JourneyTimeline, GlobalBridge, FocusAreas, MarketReach, QualitySection, ValuesSection, LeadershipSection, TranslatePipe],
  templateUrl: './about-page.html',
  styleUrl: './about-page.css',
})
export class AboutPage {
  protected readonly content = inject(SiteContentService);

  /** Banner photograph (black and white, reference banner style); editable in the dashboard. */
  protected heroImage(): string {
    return this.content.image('page.about.image', '/assets/images/corporate-v3/banner-about.webp');
  }
}
