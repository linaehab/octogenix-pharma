import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../../core/i18n/language.service';
import { jovieTranslations } from '../../jovie-translations';
import { JOVIE_GLOBAL_CONTACT, WorldMap } from './world-map';

describe('WorldMap', () => {
  const render = (interactive = true) => {
    TestBed.configureTestingModule({
      imports: [WorldMap],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(WorldMap);
    fixture.componentRef.setInput('interactive', interactive);
    fixture.detectChanges();
    return { fixture, language, element: fixture.nativeElement as HTMLElement };
  };

  const clickCountry = (element: HTMLElement, iso: string) =>
    element.querySelector<SVGPathElement>(`path[data-iso="${iso}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const regionOf = (element: HTMLElement, iso: string) => element.querySelector(`path[data-iso="${iso}"]`)?.getAttribute('data-region');

  it('uses the official regions, lighting Europe, the Middle East, Southeast Asia and Egypt', () => {
    const { element } = render();

    for (const iso of ['GBR', 'NOR', 'ISL', 'UKR', 'FRA']) {
      expect(regionOf(element, iso)).toBe('europe');
    }
    for (const iso of ['TUR', 'IRN', 'SAU', 'ARE', 'YEM']) {
      expect(regionOf(element, iso)).toBe('middle-east');
    }
    for (const iso of ['VNM', 'THA', 'IDN', 'PHL']) {
      expect(regionOf(element, iso)).toBe('southeast-asia');
    }
    expect(regionOf(element, 'EGY')).toBe('egypt');
    expect(regionOf(element, 'RUS')).toBe('northern-asia');
    expect(regionOf(element, 'GUF')).toBe('south-america');
    expect(element.querySelector('path[data-iso="FRA"]')?.classList).toContain('is-market');
    expect(element.querySelector('path[data-iso="NGA"]')?.classList).not.toContain('is-market');

    expect(Array.from(element.querySelectorAll('.legend-item')).map((b) => b.textContent?.trim())).toEqual([
      'Europe',
      'Middle East',
      'Southeast Asia',
      'Egypt',
    ]);
  });

  it('opens the Egyptian contact details from the legend or the map', () => {
    const { fixture, element } = render();

    element.querySelector<HTMLButtonElement>('.legend-item[data-region="egypt"]')!.click();
    fixture.detectChanges();
    const tooltip = element.querySelector('.tooltip');
    expect(tooltip?.querySelector('.tooltip-title')?.textContent).toContain('Egypt');
    expect(tooltip?.textContent).toContain('Octogenix Pharma');
    expect(tooltip?.querySelector('a[href^="tel:"]')).not.toBeNull();
    expect(tooltip?.querySelector('a.link')?.getAttribute('href')).toBe('/jovie/contact');
    expect(element.querySelector('path[data-iso="EGY"]')?.classList).toContain('is-selected');

    element.querySelector<HTMLButtonElement>('.tooltip .close')!.click();
    fixture.detectChanges();
    expect(element.querySelector('.tooltip')).toBeNull();
  });

  it('shows the official popups of the other markets and selects the whole region', () => {
    const { fixture, element } = render();

    clickCountry(element, 'FRA');
    fixture.detectChanges();
    expect(element.querySelector('.tooltip-title')?.textContent).toContain('Europe');
    expect(element.querySelector('.tooltip')?.textContent).toContain('Jovie is available online throughout Europe');
    expect(element.querySelector('.tooltip')?.textContent).toContain('sayhello@jovieproducts.eu');
    expect(element.querySelector('.tooltip a.link')?.getAttribute('href')).toBe('https://jovieproducts.eu');
    expect(element.querySelector('path[data-iso="GBR"]')?.classList).toContain('is-selected');

    clickCountry(element, 'SAU');
    fixture.detectChanges();
    expect(Array.from(element.querySelectorAll('.countries li')).map((li) => li.textContent?.trim())).toEqual([
      'United Arab Emirates',
      'Saudi Arabia',
      'Egypt',
      'Oman',
    ]);

    clickCountry(element, 'THA');
    fixture.detectChanges();
    expect(element.querySelector('.tooltip')?.textContent).toContain('Jovie is available in Vietnam');
    expect(element.querySelector('.tooltip a.link')?.getAttribute('href')).toBe('https://jovie.vn/');
  });

  it('says Jovie is not available yet in the other regions', () => {
    const { fixture, element } = render();

    clickCountry(element, 'NGA');
    fixture.detectChanges();
    expect(element.querySelector('.tooltip-title')?.textContent).toContain('Africa');
    expect(element.querySelector('.tooltip')?.textContent).toContain('currently not available here');
    expect(element.querySelector('.tooltip a.link')?.getAttribute('href')).toBe(JOVIE_GLOBAL_CONTACT);
    expect(element.querySelector('path[data-iso="KEN"]')?.classList).toContain('is-selected');
    expect(element.querySelector('path[data-iso="EGY"]')?.classList).not.toContain('is-selected');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(element.querySelector('.tooltip')).toBeNull();
  });

  it('is a static picture in the home summary', () => {
    const { fixture, element } = render(false);

    clickCountry(element, 'EGY');
    fixture.detectChanges();
    expect(element.querySelector('.tooltip')).toBeNull();
    expect(element.querySelector('.legend')).toBeNull();
  });
});
