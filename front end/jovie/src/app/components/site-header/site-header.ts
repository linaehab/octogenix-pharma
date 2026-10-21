import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
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
  protected readonly isHomePage = signal(false);
  protected readonly language = inject(LanguageService);
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

  protected toggleLanguage(): void {
    this.language.toggleLanguage();
    this.closeNavigation();
  }

  protected toggleNavigation(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeNavigation(): void {
    this.isMenuOpen.set(false);
  }
}
