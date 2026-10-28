import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { FAQ_CONTENT } from '../../data/faq-content';
import { jovieTranslations } from '../../jovie-translations';
import { FaqSection } from './faq-section';

describe('FaqSection', () => {
  const render = (summary = false) => {
    TestBed.configureTestingModule({
      imports: [FaqSection],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(FaqSection);
    fixture.componentRef.setInput('summary', summary);
    fixture.detectChanges();
    return { fixture, language, element: fixture.nativeElement as HTMLElement };
  };

  it('shows the official questions and groups in English and in Arabic', () => {
    const { fixture, language, element } = render();

    expect(Array.from(element.querySelectorAll('.group-title')).map((h) => h.textContent?.trim())).toEqual([
      'About the Use',
      'About the Product',
      'About the Company',
    ]);
    expect(element.querySelectorAll('details').length).toBe(17);
    expect(element.querySelector('summary')?.textContent).toBe(FAQ_CONTENT.en[0].items[0].question);

    language.setLanguage('ar');
    fixture.detectChanges();
    expect(element.querySelector('.group-title')?.textContent?.trim()).toBe('كيفية الاستخدام؟');
    expect(element.querySelectorAll('details').length).toBe(17);
    expect(element.textContent).toContain('أين يمكنني شراء منتجات «جوفي»؟');
  });

  it('is the Egyptian version: Octogenix contact details, Egypt as a market, spelling fixed', () => {
    const { element } = render();
    const answer = (question: string) =>
      Array.from(element.querySelectorAll('details')).find((d) => d.querySelector('summary')?.textContent === question)!;

    const reach = answer('How can I reach Jovie?');
    expect(reach.querySelector('a[href^="mailto:"]')?.getAttribute('href')).toBe('mailto:info@octogenixpharma.com');
    expect(reach.querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:+201090075087');
    expect(reach.textContent).toContain('we will get back to you as soon as possible!');
    expect(element.textContent).not.toContain('jovieproducts.com');
    expect(element.textContent).not.toContain('{email}');

    expect(answer('Where can I buy Jovie products?').textContent).toContain('Vietnam and Egypt, where Jovie is distributed by Octogenix Pharma');
    expect(element.textContent).not.toContain('excist');
    expect(element.textContent).not.toContain('we advice');
  });

  it('shows the first three questions and a link to the FAQ page in the home summary', () => {
    const { element } = render(true);

    expect(element.querySelectorAll('details').length).toBe(3);
    expect(element.querySelector('.jv-section-cta a')?.getAttribute('href')).toBe('/jovie/faq');
  });
});
