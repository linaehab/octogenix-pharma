import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AboutSection } from '../../components/about-section/about-section';
import { HeroSection } from '../../components/hero-section/hero-section';
import { ServicesSection } from '../../components/services-section/services-section';
import { ValuesSection } from '../../components/values-section/values-section';
import { CompanyImpact } from '../../components/company-impact/company-impact';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    AboutSection,
    ServicesSection,
    ValuesSection,
    CompanyImpact,
    RouterLink,
    TranslatePipe,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {}
