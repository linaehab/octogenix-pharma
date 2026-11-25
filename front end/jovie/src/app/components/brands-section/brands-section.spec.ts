import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BrandsSection } from './brands-section';
import { SiteContentService } from '../../core/content/site-content.service';
import { ApiBrand } from '../../core/content/site-content.models';

describe('BrandsSection', () => {
  let fixture: ComponentFixture<BrandsSection>;
  let compiled: HTMLElement;

  const brand = (overrides: Partial<ApiBrand>): ApiBrand => ({
    slug: 'brand',
    name: { en: 'Brand', ar: 'علامة' },
    label: { en: 'Label', ar: 'تصنيف' },
    short_description: { en: 'Description', ar: 'وصف' },
    description: { en: null, ar: null },
    logo_url: null,
    image_url: '/storage/uploads/images/2026/11/brand.webp',
    hover_image_url: null,
    image_alt: { en: 'Alt', ar: 'نص بديل' },
    cta_label: { en: 'Visit', ar: 'زيارة' },
    link: { type: 'none', url: null },
    has_store: false,
    is_featured: false,
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandsSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BrandsSection);
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('shows the bundled Jovie card until brands are loaded', () => {
    expect(compiled.querySelectorAll('.brand-feature').length).toBe(1);
    expect(compiled.querySelector('.brand-name')?.textContent).toContain('Jovie');
    expect(compiled.querySelector('.brand-panel .text-link')?.getAttribute('href')).toBe('/contact');
    expect(compiled.querySelector('.brand-panel .store-button')?.getAttribute('href')).toBe('/jovieEgypt');
    expect(compiled.querySelector('.brand-logo')?.getAttribute('src')).toBe('/assets/images/jovie/logo-official-yellow.png');
    // Only the approved texts: no label, description or summary.
    expect(compiled.querySelector('.brand-label')).toBeNull();
    expect(compiled.querySelector('.brand-description')).toBeNull();
    expect(compiled.querySelector('.brands-heading > div > p')).toBeNull();
  });

  it('shows the logo saved in the dashboard, or else the brand photograph', () => {
    TestBed.inject(SiteContentService).brands.set([
      brand({ slug: 'jovie', name: { en: 'Jovie', ar: 'جوفي' }, logo_url: '/assets/images/jovie/logo-official-yellow.png', image_url: null }),
      brand({ slug: 'other', name: { en: 'Other', ar: 'أخرى' } }),
    ]);
    fixture.detectChanges();

    const cards = compiled.querySelectorAll('.brand-feature');
    expect(cards[0].querySelector('.brand-logo')?.getAttribute('src')).toBe('/assets/images/jovie/logo-official-yellow.png');
    expect(cards[0].querySelector('.brand-image')).toBeNull();
    expect(cards[1].querySelector('.brand-logo')).toBeNull();
    expect(cards[1].querySelector('.brand-image')?.getAttribute('src')).toBe('/storage/uploads/images/2026/11/brand.webp');
    expect(cards[1].querySelector('.brand-label')?.textContent).toBe('Label');
  });

  it('offers a store button only for brands with a store in this app', () => {
    TestBed.inject(SiteContentService).brands.set([
      brand({ slug: 'jovie', name: { en: 'Jovie', ar: 'جوفي' }, has_store: true }),
      brand({ slug: 'other', has_store: true }),
      brand({ slug: 'plain' }),
    ]);
    fixture.detectChanges();

    const cards = compiled.querySelectorAll('.brand-feature');
    const store = cards[0].querySelector('.store-button');
    expect(store?.getAttribute('href')).toBe('/jovieEgypt');
    expect(store?.textContent).toContain('Visit Jovie Egypt website');
    expect(cards[1].querySelector('.store-button')).toBeNull();
    expect(cards[2].querySelector('.store-button')).toBeNull();
  });

  it('renders one card per active brand with the right kind of link', () => {
    TestBed.inject(SiteContentService).brands.set([
      brand({ slug: 'jovie', name: { en: 'Jovie', ar: 'جوفي' }, link: { type: 'internal', url: '/contact' } }),
      brand({ slug: 'other', name: { en: 'Other', ar: 'أخرى' }, link: { type: 'external', url: 'https://other.example.com' } }),
      brand({ slug: 'plain', name: { en: 'Plain', ar: 'بسيطة' } }),
    ]);
    fixture.detectChanges();

    const cards = compiled.querySelectorAll('.brand-feature');
    expect(cards.length).toBe(3);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/contact');
    expect(cards[1].querySelector('a')?.getAttribute('href')).toBe('https://other.example.com');
    expect(cards[1].querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(cards[2].querySelector('a')).toBeNull();
    expect(cards[2].querySelector('.image-swap__alternate')).toBeNull();
  });
});
