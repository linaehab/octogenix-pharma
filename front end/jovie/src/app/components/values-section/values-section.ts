import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-values-section',
  imports: [TranslatePipe],
  templateUrl: './values-section.html',
  styleUrl: './values-section.css',
})
export class ValuesSection {
  protected readonly coreValues: {
    title: string;
    description?: string;
    symbol: string;
    image: string;
    hoverImage: string;
    imageAlt: string;
  }[] = [
    {
      title: 'values.quality',
      description: 'values.qualityDescription',
      symbol: '◈',
      image: '/assets/images/value-quality-lab.jpg',
      hoverImage: '/assets/images/value-innovation-lab.jpg',
      imageAlt: 'values.qualityImageAlt',
    },
    {
      title: 'values.innovation',
      symbol: '✳',
      image: '/assets/images/value-innovation-lab.jpg',
      hoverImage: '/assets/images/value-quality-lab.jpg',
      imageAlt: 'values.innovationImageAlt',
    },
    {
      title: 'values.integrity',
      symbol: '◇',
      image: '/assets/images/values-integrity-check.jpg',
      hoverImage: '/assets/images/value-quality-lab.jpg',
      imageAlt: 'values.integrityImageAlt',
    },
    {
      title: 'values.distributionExcellence',
      symbol: '↗',
      image: '/assets/images/value-distribution.jpg',
      hoverImage: '/assets/images/service-warehouse-forklift.jpg',
      imageAlt: 'values.distributionImageAlt',
    },
    {
      title: 'values.sustainable',
      symbol: '∞',
      image: '/assets/images/value-sustainable-growth.jpg',
      hoverImage: '/assets/images/about-baby.jpg',
      imageAlt: 'values.growthImageAlt',
    },
  ];

  protected readonly companyValues: { title: string; description: string }[] = [
    { title: 'values.commitment', description: 'values.commitmentDescription' },
    { title: 'values.companyExcellence', description: 'values.excellenceDescription' },
    { title: 'values.harmony', description: 'values.harmonyDescription' },
    { title: 'values.growth', description: 'values.growthDescription' },
    { title: 'values.credibility', description: 'values.credibilityDescription' },
  ];
}
