import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { LocalizedTitleStrategy } from './core/i18n/localized-title.strategy';
import { IntroDialogService } from './jovie/intro-dialog/intro-dialog.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), 
        provideRouter(routes),
        { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should navigate to each page from the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const compiled = fixture.nativeElement as HTMLElement;

    for (const [path, label] of [
      ['/', 'Home'],
      ['/about', 'About Us'],
      ['/services', 'Services'],
      ['/brands', 'Our Brands'],
      ['/contact', 'Contact Us'],
    ]) {
      await router.navigateByUrl(path);
      fixture.detectChanges();
      expect(router.url).toBe(path);
      expect(compiled.querySelector('.primary-navigation')?.textContent).toContain(label);
    }
  });

  it('should open and close the mobile navigation', async () => {
    const fixture = TestBed.createComponent(App);
    // The header belongs to the corporate layout route, rendered once the router has navigated.
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('.menu-toggle');
    const navigation = compiled.querySelector<HTMLElement>('#primary-navigation');

    expect(button?.getAttribute('aria-expanded')).toBe('false');
    button?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(navigation?.classList.contains('is-open')).toBe(true);

    navigation?.querySelector<HTMLAnchorElement>('a[routerlink="/about"]')?.click();
    fixture.detectChanges();
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    await TestBed.inject(Router).navigateByUrl('/about');
  });

  describe('Jovie store', () => {
    beforeEach(() => sessionStorage.setItem(IntroDialogService.STORAGE_KEY, '1'));
    afterEach(() => sessionStorage.removeItem(IntroDialogService.STORAGE_KEY));

    const open = async (url: string) => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await TestBed.inject(Router).navigateByUrl(url);
      fixture.detectChanges();
      // The Shop asks the API for products; an open request would keep the app from settling.
      TestBed.inject(HttpTestingController)
        .match((req) => req.url === '/api/v1/products')
        .forEach((req) => req.flush({ data: [] }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      return { fixture, compiled: fixture.nativeElement as HTMLElement };
    };

    it('uses its own layout, starts the navigation with Shop and puts the Shop right after the hero', async () => {
      const { compiled } = await open('/jovie');

      expect(compiled.querySelector('app-site-header')).toBeNull();
      expect(compiled.querySelector('app-jovie-header')).not.toBeNull();
      expect(compiled.querySelector('#jovie-navigation li a')?.textContent?.trim()).toBe('Shop');
      const sections = Array.from(compiled.querySelectorAll('app-jovie-home-page > *')).map((el) => el.tagName.toLowerCase());
      expect(sections.slice(0, 2)).toEqual(['app-jovie-hero', 'app-shop-section']);
      expect(document.title).toBe('Jovie | Organic Goat Milk Formula');
    });

    it('gives every navigation item its own page, title and active link', async () => {
      for (const [path, heading, title] of [
        ['/jovie/shop', 'Discover All Our Products', 'Shop | Jovie'],
        ['/jovie/why', 'Why Jovie Goat', 'Why Jovie Goat | Jovie'],
        ['/jovie/feeding-guide', 'Feeding guide', 'Feeding guide | Jovie'],
        ['/jovie/where-to-find', 'Where to find', 'Where to find | Jovie'],
        ['/jovie/faq', 'Frequently Asked Questions', 'FAQ | Jovie'],
      ]) {
        const { compiled } = await open(path);

        expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(heading);
        expect(document.title).toBe(title);
        const active = compiled.querySelector('#jovie-navigation a.is-active');
        expect(active?.getAttribute('href')).toBe(path);
        expect(active?.getAttribute('aria-current')).toBe('page');
      }
    });

    it('summarises each section on the home page with a link to its page', async () => {
      const { compiled } = await open('/jovie');
      const hrefs = (selector: string) =>
        Array.from(compiled.querySelectorAll(`${selector} a`)).map((a) => a.getAttribute('href'));

      expect(hrefs('app-jovie-hero')).toEqual(['/jovie/why', '/jovie/shop']);
      expect(hrefs('app-shop-section')).toContain('/jovie/shop');
      expect(hrefs('app-why-benefits')).toContain('/jovie/why');
      expect(hrefs('app-feeding-guide')).toEqual([
        '/jovie/feeding-guide?stage=1',
        '/jovie/feeding-guide?stage=2',
        '/jovie/feeding-guide?stage=3',
      ]);
      expect(hrefs('app-where-to-find')).toContain('/jovie/where-to-find');
      expect(hrefs('app-faq-section')).toContain('/jovie/faq');
      expect(compiled.querySelectorAll('app-faq-section details').length).toBe(3);
      expect(compiled.querySelector('a[href="#"], a:not([href])')).toBeNull();
    });

    it('keeps the header in the colour of each page when it turns solid', async () => {
      for (const [path, tone] of [
        ['/jovie', 'yellow'],
        ['/jovie/shop', 'yellow'],
        ['/jovie/where-to-find', 'navy'],
        ['/jovie/faq', 'red'],
      ]) {
        const { compiled } = await open(path);
        expect(compiled.querySelector('app-jovie-header .header')?.getAttribute('data-tone')).toBe(tone);
      }
    });

    it('shows the official Why Jovie Goat page and links its cards to the official detail pages', async () => {
      const { compiled } = await open('/jovie/why');

      const sections = Array.from(compiled.querySelectorAll('app-jovie-why-page > *')).map((el) => el.tagName.toLowerCase());
      expect(sections).toEqual([
        'app-page-intro',
        'app-why-spirit',
        'app-why-quote',
        'app-why-benefits',
        'app-why-organic',
        'app-why-different',
        'app-how-its-made',
      ]);
      expect(compiled.querySelector('app-page-intro app-pattern-overlay')).not.toBeNull();
      expect(compiled.querySelectorAll('app-why-benefits .card').length).toBe(6);
      expect(compiled.querySelector('app-why-benefits .card')?.getAttribute('href')).toBe('/jovie/why/makes-good-sense#fat');
      expect(Array.from(compiled.querySelectorAll('app-why-different a')).map((a) => a.getAttribute('href'))).toEqual([
        '/jovie/why/organic',
        '/jovie/why/organic',
        '/jovie/why/without-promise',
      ]);
      expect(compiled.querySelector('app-why-quote blockquote')?.textContent).toContain('We are caring parents');
    });

    it('opens the official detail pages under a green header', async () => {
      for (const [path, heading] of [
        ['/jovie/why/makes-good-sense', 'Why Jovie Goat makes good sense'],
        ['/jovie/why/organic', 'Organic Goat Milk'],
        ['/jovie/why/without-promise', "Jovie's without promise"],
      ]) {
        const { compiled } = await open(path);
        expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(heading);
        expect(compiled.querySelector('app-page-intro .intro')?.getAttribute('data-tone')).toBe('green');
        expect(compiled.querySelector('app-jovie-header .header')?.getAttribute('data-tone')).toBe('green');
        expect(compiled.querySelector('#jovie-navigation a.is-active')?.getAttribute('href')).toBe('/jovie/why');
      }
    });

    it('opens the feeding guide on the stage given in the link', async () => {
      const { compiled } = await open('/jovie/feeding-guide?stage=2');

      const selected = compiled.querySelector('app-feeding-guide .age.is-selected');
      expect(selected?.textContent).toContain('Stage 2');
      expect(compiled.querySelector('app-feeding-guide .result-stage')?.textContent).toContain('6–12 months');
    });

    it('shows the whole FAQ on its page', async () => {
      const { compiled } = await open('/jovie/faq');

      expect(compiled.querySelector('app-page-intro .intro')?.getAttribute('data-tone')).toBe('red');
      expect(compiled.querySelectorAll('app-faq-section .group').length).toBe(3);
      expect(compiled.querySelectorAll('app-faq-section details').length).toBe(17);
    });

    it('opens its own contact page instead of the Octogenix one', async () => {
      const { compiled } = await open('/jovie/contact');

      expect(compiled.querySelector('app-jovie-contact-form form')).not.toBeNull();
      expect(compiled.querySelector('app-contact-section')).toBeNull();
      expect(document.title).toBe('Say hello | Jovie');
    });

    it('switches to Arabic right-to-left and back to English', async () => {
      const { fixture, compiled } = await open('/jovie');
      const toggle = compiled.querySelector<HTMLButtonElement>('app-jovie-header .language-toggle')!;

      toggle.click();
      fixture.detectChanges();
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');
      expect(compiled.querySelector('#jovie-navigation li a')?.textContent?.trim()).toBe('تسوّق');
      expect(document.title).toBe('جوفي | تركيبة حليب الماعز العضوي');

      toggle.click();
      fixture.detectChanges();
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  it('should switch all page copy and document direction to Arabic', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const languageButton = compiled.querySelector<HTMLButtonElement>('.language-toggle');

    languageButton?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.primary-navigation')?.textContent).toContain('الرئيسية');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    await TestBed.inject(Router).navigateByUrl('/about');
    fixture.detectChanges();
    expect(document.title).toContain('من نحن');

    languageButton?.click();
    fixture.detectChanges();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
