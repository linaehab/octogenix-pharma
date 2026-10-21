import { Component } from '@angular/core';
import { AboutSection } from '../../components/about-section/about-section';
import { BrandsSection } from '../../components/brands-section/brands-section';
import { ContactSection } from '../../components/contact-section/contact-section';
import { HeroSection } from '../../components/hero-section/hero-section';
import { ServicesSection } from '../../components/services-section/services-section';
import { ValuesSection } from '../../components/values-section/values-section';
import { QualitySection } from '../../components/quality-section/quality-section';

@Component({
  selector: 'app-home-page',
  imports: [
    HeroSection,
    AboutSection,
    ServicesSection,
    ValuesSection,
    QualitySection,
    BrandsSection,
    ContactSection,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {}
