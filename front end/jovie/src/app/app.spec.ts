import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { LanguageService } from './core/i18n/language.service';
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
        ['/jovie/products', 'Discover All Our Products', 'Jovie Goat Products | Jovie'],
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

    it('follows the official home: hero, the Shop, then the official sections with their links', async () => {
      const { compiled } = await open('/jovie');
      const hrefs = (selector: string) =>
        Array.from(compiled.querySelectorAll(`${selector} a`)).map((a) => a.getAttribute('href'));

      const sections = Array.from(compiled.querySelectorAll('app-jovie-home-page > *')).map((el) => el.tagName.toLowerCase());
      expect(sections).toEqual([
        'app-jovie-hero',
        'app-shop-section',
        'app-home-solution',
        'app-home-parents',
        'app-home-products',
        'app-home-where',
      ]);
      expect(hrefs('app-jovie-hero')).toEqual(['/jovie/why', '/jovie/shop']);
      expect(hrefs('app-shop-section')).toContain('/jovie/shop');
      expect(hrefs('app-home-solution')).toEqual(['/jovie/why', '/jovie/why', '/jovie/why']);
      expect(hrefs('app-home-parents')).toEqual(['/jovie/why']);
      expect(hrefs('app-home-products')).toEqual([
        '/jovie/products',
        '/jovie/products/infant-goat-milk',
        '/jovie/products/follow-on-goat-milk',
        '/jovie/products/toddler-goat-milk',
      ]);
      expect(compiled.querySelector('app-home-products .tile img')?.getAttribute('src')).toBe('/assets/images/jovie/products/eg-stage-1-front.webp');
      expect(hrefs('app-home-where')).toEqual(['/jovie/where-to-find']);
      expect(compiled.querySelector('app-home-where')?.textContent).toContain('Octogenix Pharma');
      expect(compiled.querySelector('a[href="#"], a:not([href])')).toBeNull();
    });

    it('keeps the header in the colour of each page when it turns solid', async () => {
      for (const [path, tone] of [
        ['/jovie', 'yellow'],
        ['/jovie/shop', 'yellow'],
        ['/jovie/where-to-find', 'navy'],
        ['/jovie/faq', 'red'],
        ['/jovie/products', 'yellow'],
        ['/jovie/products/infant-goat-milk', 'yellow'],
        ['/jovie/products/follow-on-goat-milk', 'pink'],
        ['/jovie/products/toddler-goat-milk', 'blue'],
      ]) {
        const { compiled } = await open(path);
        expect(compiled.querySelector('app-jovie-header .header')?.getAttribute('data-tone')).toBe(tone);
      }
    });

    it('lists the three products one below the other, with the Egyptian tins and links to their pages', async () => {
      const { compiled } = await open('/jovie/products');

      const products = Array.from(compiled.querySelectorAll<HTMLElement>('.products .product'));
      expect(products.map((p) => p.querySelector('h2')?.textContent?.trim())).toEqual([
        'Organic Infant Goat Milk',
        'Organic Follow-on Goat Milk',
        'Organic Toddler Goat Milk',
      ]);
      expect(products.map((p) => p.querySelector('.tile img')?.getAttribute('src'))).toEqual([
        '/assets/images/jovie/products/eg-stage-1-front.webp',
        '/assets/images/jovie/products/eg-stage-2-front.webp',
        '/assets/images/jovie/products/eg-stage-3-front.webp',
      ]);
      expect(products.map((p) => p.querySelector('a.jv-button')?.getAttribute('href'))).toEqual([
        '/jovie/products/infant-goat-milk',
        '/jovie/products/follow-on-goat-milk',
        '/jovie/products/toddler-goat-milk',
      ]);
      expect(products[2].querySelector('.facts')?.textContent).toContain('Follow-on Formula for Toddlers');
      expect(Array.from(compiled.querySelectorAll('app-page-intro a')).map((a) => a.getAttribute('href'))).toEqual([
        '/jovie/products/infant-goat-milk',
        '/jovie/products/follow-on-goat-milk',
        '/jovie/products/toddler-goat-milk',
      ]);
      expect(compiled.querySelector('.find a')?.getAttribute('href')).toBe('/jovie/where-to-find');
      expect(compiled.querySelector('#jovie-navigation a.is-active')?.getAttribute('href')).toBe('/jovie/products');
    });

    it('opens each product page with its own sections, Egyptian label and neighbours', async () => {
      for (const [slug, stage, name, previous, next, label] of [
        ['infant-goat-milk', 1, 'Organic Infant Goat Milk', 'toddler-goat-milk', 'follow-on-goat-milk', 'infant-formula'],
        ['follow-on-goat-milk', 2, 'Organic Follow-on Goat Milk', 'infant-goat-milk', 'toddler-goat-milk', 'follow-on-formula'],
        ['toddler-goat-milk', 3, 'Organic Toddler Goat Milk', 'follow-on-goat-milk', 'infant-goat-milk', 'toddler-formula'],
      ] as const) {
        const { compiled } = await open(`/jovie/products/${slug}`);

        const sections = Array.from(compiled.querySelectorAll('app-jovie-product-page > *')).map((el) => el.tagName.toLowerCase());
        expect(sections).toEqual(['app-product-header', 'app-product-about', 'app-product-cta', 'app-product-quotes']);
        expect(compiled.querySelector('h1')?.textContent?.trim()).toBe(name);
        expect(Array.from(compiled.querySelectorAll('.title-row a')).map((a) => a.getAttribute('href'))).toEqual([
          `/jovie/products/${previous}`,
          `/jovie/products/${next}`,
        ]);
        expect(Array.from(compiled.querySelectorAll('.slide img')).map((img) => img.getAttribute('src'))).toEqual(
          ['front', 'table', 'ingredients', 'prepare'].map((view) => `/assets/images/jovie/products/eg-stage-${stage}-${view}.webp`),
        );
        const download = compiled.querySelector('app-product-cta a.jv-button');
        expect(download?.getAttribute('href')).toBe(`/downloads/jovie/jovie-goat-${stage}-${label}-egypt-label.pdf`);
        expect(download?.hasAttribute('download')).toBeTrue();
        expect(compiled.querySelectorAll('app-product-about .usp').length).toBe(3);
        expect(compiled.querySelector('app-product-about .usp a')?.getAttribute('href')).toBe('/jovie/why/makes-good-sense#digest');
        expect(compiled.querySelectorAll('app-product-quotes .item').length).toBe(3);
        expect(compiled.querySelector('app-product-quotes .head a')?.getAttribute('href')).toBe('/jovie/contact');
        expect(compiled.querySelector('#jovie-navigation a.is-active')?.getAttribute('href')).toBe('/jovie/products');
      }
    });

    it('turns the tin with the view buttons and zooms in on the selected view', async () => {
      const { fixture, compiled } = await open('/jovie/products/follow-on-goat-milk');
      const [previous, next] = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.view-nav button'));
      const activeImage = () => compiled.querySelector('.slide[data-position="active"] img')?.getAttribute('src');

      expect(compiled.querySelector('.view-label')?.textContent).toBe('Front');
      next.click();
      fixture.detectChanges();
      expect(compiled.querySelector('.view-label')?.textContent).toBe('View right');
      expect(activeImage()).toBe('/assets/images/jovie/products/eg-stage-2-table.webp');
      previous.click();
      previous.click();
      fixture.detectChanges();
      expect(compiled.querySelector('.view-label')?.textContent).toBe('View back');

      compiled.querySelector<HTMLButtonElement>('.zoom-button')!.click();
      fixture.detectChanges();
      const dialog = compiled.querySelector<HTMLDialogElement>('dialog.zoom')!;
      expect(dialog.open).toBeTrue();
      expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/assets/images/jovie/products/eg-stage-2-prepare-zoom.webp');
      dialog.querySelector<HTMLButtonElement>('.close')!.click();
      expect(dialog.open).toBeFalse();
    });

    it('shows the product pages in Arabic', async () => {
      const { fixture, compiled } = await open('/jovie/products/toddler-goat-milk');
      const language = TestBed.inject(LanguageService);

      language.setLanguage('ar');
      fixture.detectChanges();
      expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('حليب النمو');
      expect(compiled.querySelector('app-product-about h2')?.textContent).toBe('كل ما يتعلق بجوفي جوت تركيبة حليب النمو العضوية');
      expect(compiled.querySelector('.view-label')?.textContent).toBe('الواجهة');

      language.setLanguage('en');
      fixture.detectChanges();
      expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('Organic Toddler Goat Milk');
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

    it('shows the detail pages in Arabic when Arabic is selected', async () => {
      const { fixture, compiled } = await open('/jovie/why/makes-good-sense');
      const language = TestBed.inject(LanguageService);

      language.setLanguage('ar');
      fixture.detectChanges();
      expect(compiled.querySelector('h1')?.textContent?.trim()).toBe('لماذا جوفي جوت اختيار منطقي');
      expect(compiled.querySelector('.article h2')?.textContent).toBe('حليب الماعز هو الأساس الصحيح');
      expect(compiled.querySelector('.article #vitamins')?.textContent).toContain('غني بالفيتامينات والمعادن');

      language.setLanguage('en');
      fixture.detectChanges();
      expect(compiled.querySelector('.article h2')?.textContent).toBe('Goat Milk is the Right Base');
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
