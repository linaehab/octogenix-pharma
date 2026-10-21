import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-services-section',
  imports: [TranslatePipe],
  templateUrl: './services-section.html',
  styleUrl: './services-section.css',
})
export class ServicesSection {
  protected readonly services = [
    {
      number: '01',
      title: 'services.distributionTitle',
      description: 'services.distributionDescription',
      imageAlt: 'services.distributionImageAlt',
      image: '/assets/images/service-warehouse-forklift.jpg',
      hoverImage: '/assets/images/service-import-warehouse.jpg',
    },
    {
      number: '02',
      title: 'services.importTitle',
      description: 'services.importDescription',
      imageAlt: 'services.importImageAlt',
      image: '/assets/images/service-import-warehouse.jpg',
      hoverImage: '/assets/images/value-distribution.jpg',
    },
    {
      number: '03',
      title: 'services.supplementsTitle',
      description: 'services.supplementsDescription',
      imageAlt: 'services.supplementsImageAlt',
      image: '/assets/images/service-nutrition-preparation.jpg',
      hoverImage: '/assets/images/mission-baby-feeding.jpg',
    },
  ];
}
