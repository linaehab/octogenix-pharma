import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LanguageService } from '../../core/i18n/language.service';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  let component: SiteHeader;
  let fixture: ComponentFixture<SiteHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeader],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle the services menu and switch the active service category', () => {
    (component as any).toggleServicesMenu();
    expect((component as any).isServicesMenuOpen()).toBeTrue();

    (component as any).selectServicesCategory('suppliers');
    expect((component as any).isServicesMenuOpen()).toBeFalse();
  });

  it('should toggle the document language between English and Arabic', () => {
    const language = TestBed.inject(LanguageService);

    expect(language.currentLanguage()).toBe('en');
    language.toggleLanguage();
    expect(language.currentLanguage()).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });
});
