import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroSection } from '../../components/hero-section/hero-section';
import { ServicesSection } from '../../components/services-section/services-section';
import { HomeStory } from '../../components/home-story/home-story';
import { HomePartners } from '../../components/home-partners/home-partners';
import { CompanyImpact } from '../../components/company-impact/company-impact';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    HomeStory,
    ServicesSection,
    HomePartners,
    CompanyImpact,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {}
