import { Component } from '@angular/core';
import { AboutSection } from '../../components/about-section/about-section';
import { HeroSection } from '../../components/hero-section/hero-section';
import { ServicesSection } from '../../components/services-section/services-section';
import { ValuesSection } from '../../components/values-section/values-section';
import { CompanyImpact } from '../../components/company-impact/company-impact';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    AboutSection,
    ServicesSection,
    ValuesSection,
    CompanyImpact
],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {}
