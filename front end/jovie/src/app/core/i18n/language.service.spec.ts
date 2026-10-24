import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  let language: LanguageService;
  let document: Document;
  let initialTitle: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    language = TestBed.inject(LanguageService);
    document = TestBed.inject(DOCUMENT);
    initialTitle = document.title;
    language.setLanguage('en');
  });

  it('translates copy and interpolates parameters', () => {
    expect(language.translate('header.home')).toBe('Home');
    expect(language.translate('footer.copyright', { year: 2026 })).toContain('2026');
  });

  it('returns the key when a translation is unavailable', () => {
    expect(language.translate('missing.translation')).toBe('missing.translation');
  });

  it('updates language, direction, and the current route title', () => {
    language.setRouteTitle('title.about', 'About Us | Octogenix Pharma');
    language.setLanguage('ar');

    expect(language.currentLanguage()).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toContain('من نحن');
  });

  it('toggles between Arabic and English', () => {
    language.toggleLanguage();

    expect(language.currentLanguage()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    language.toggleLanguage();

    expect(language.currentLanguage()).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  afterEach(() => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    document.title = initialTitle;
  });
});
