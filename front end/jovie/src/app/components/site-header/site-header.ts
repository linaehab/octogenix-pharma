import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { contactEmail, contactPhones } from '../../core/content/contact-details';
import { SiteContentService } from '../../core/content/site-content.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
})
export class SiteHeader {
  protected readonly isMenuOpen = signal(false);
  protected readonly isServicesMenuOpen = signal(false);
  protected readonly isHomePage = signal(false);
  /** True once the page is scrolled: the header turns from transparent to solid white. */
  protected readonly isScrolled = signal(false);
  protected readonly language = inject(LanguageService);
  private readonly content = inject(SiteContentService);
  /** The first phone number and the e-mail address (from the dashboard settings) for the top bar. */
  protected readonly phone = computed(() => contactPhones(this.content)[0] ?? null);
  protected readonly email = computed(() => contactEmail(this.content));
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.isHomePage.set(this.router.url === '/');
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.isHomePage.set(event.urlAfterRedirects === '/'));
  }

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.isScrolled.set(window.scrollY > 24);
  }

  protected toggleLanguage(): void {
    this.language.toggleLanguage();
    this.closeNavigation();
  }

  protected toggleNavigation(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected toggleServicesMenu(): void {
    this.isServicesMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeNavigation(): void {
    this.isMenuOpen.set(false);
    this.isServicesMenuOpen.set(false);
  }

  protected selectServicesCategory(category: 'customers' | 'suppliers'): void {
    this.isServicesMenuOpen.set(false);
    this.router.navigate(['/services'], { queryParams: { category } });
    this.closeNavigation();
  }
}
