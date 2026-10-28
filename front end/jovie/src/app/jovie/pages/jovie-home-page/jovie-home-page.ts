import { Component } from '@angular/core';
import { FaqSection } from '../../components/faq-section/faq-section';
import { FeedingGuide } from '../../components/feeding-guide/feeding-guide';
import { JovieHero } from '../../components/jovie-hero/jovie-hero';
import { ShopSection } from '../../components/shop-section/shop-section';
import { WhereToFind } from '../../components/where-to-find/where-to-find';
import { WhyBenefits } from '../../components/why/why-benefits';

/**
 * Jovie store home (/jovie): the hero, then a summary of every section with a link to its own
 * page. The Shop cards come straight after the hero.
 */
@Component({
  selector: 'app-jovie-home-page',
  imports: [JovieHero, ShopSection, WhyBenefits, FeedingGuide, WhereToFind, FaqSection],
  template: `
    <app-jovie-hero />
    <app-shop-section [summary]="true" />
    <app-why-benefits moreLink="/jovie/why" />
    <app-feeding-guide [summary]="true" />
    <app-where-to-find />
    <app-faq-section [summary]="true" />
  `,
  styles: ':host { display: block; }',
})
export class JovieHomePage {}
