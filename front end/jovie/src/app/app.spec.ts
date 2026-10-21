import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { LocalizedTitleStrategy } from './core/i18n/localized-title.strategy';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
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

  it('should switch all page copy and document direction to Arabic', async () => {
    const fixture = TestBed.createComponent(App);
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
