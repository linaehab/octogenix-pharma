import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesSection } from './services-section';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';

describe('ServicesSection', () => {
  let component: ServicesSection;
  let fixture: ComponentFixture<ServicesSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the customer service group by default', () => {
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Contracting and Documentation');
    expect(content).toContain('Order Reception');
    expect(content).toContain('Customer Service');
  });

  it('should allow switching to the supplier service group', () => {
    (component as any).selectCategory('suppliers');
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Distribution');
    expect(content).toContain('Regulatory Affairs');
    expect(content).toContain('Scientific Office');
  });

  it('shows services from the API, numbered in order and in the current language', () => {
    TestBed.inject(SiteContentService).services.set({
      customers: [
        { id: 7, title: { en: 'Cold Chain', ar: 'سلسلة التبريد' }, description: { en: 'Cooled storage.', ar: 'تخزين مبرد.' },
          image_url: '/assets/images/hero-warehouse.jpg', hover_image_url: null, image_alt: { en: 'Warehouse', ar: 'مستودع' } },
      ],
      suppliers: [],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Cold Chain');
    expect(element.textContent).not.toContain('Contracting and Documentation');
    expect(element.querySelector('.service-number')?.textContent).toBe('01');

    TestBed.inject(LanguageService).setLanguage('ar');
    fixture.detectChanges();
    expect(element.textContent).toContain('سلسلة التبريد');
    TestBed.inject(LanguageService).setLanguage('en');
  });
});

