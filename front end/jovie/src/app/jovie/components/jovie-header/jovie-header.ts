import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/** Jovie store pages, in navigation order (Shop first). */
export const JOVIE_NAV = [
  { path: '/jovie/shop', label: 'jovie.nav.shop' },
  { path: '/jovie/why', label: 'jovie.nav.why' },
  { path: '/jovie/feeding-guide', label: 'jovie.nav.feedingGuide' },
  { path: '/jovie/where-to-find', label: 'jovie.nav.whereToFind' },
  { path: '/jovie/faq', label: 'jovie.nav.faq' },
] as const;

/** Colour of the solid header, from the route's `headerTone` data (default yellow). */
export type HeaderTone = 'yellow' | 'navy' | 'red' | 'green';

const toneOf = (route: ActivatedRouteSnapshot | null): HeaderTone => {
  let tone: HeaderTone = 'yellow';
  for (let r = route; r; r = r.firstChild) {
    tone = (r.data['headerTone'] as HeaderTone | undefined) ?? tone;
  }
  return tone;
};

/**
 * Transparent over the coloured band at the top of each page, like the official site; once the
 * page scrolls it gets that band's colour (yellow, or navy / red on the pages that start with
 * them) so the white links stay readable.
 */
@Component({
  selector: 'app-jovie-header',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './jovie-header.html',
  styleUrl: './jovie-header.css',
})
export class JovieHeader {
  protected readonly language = inject(LanguageService);
  protected readonly pages = JOVIE_NAV;
  protected readonly isMenuOpen = signal(false);
  protected readonly isScrolled = signal(false);
  protected readonly tone = signal<HeaderTone>('yellow');

  constructor() {
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);
    const router = inject(Router);

    this.tone.set(toneOf(router.routerState.snapshot.root));
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.tone.set(toneOf(router.routerState.snapshot.root)));

    afterNextRender(() => {
      const window = document.defaultView;
      if (!window) {
        return;
      }
      const update = () => this.isScrolled.set(window.scrollY > 24);
      update();
      window.addEventListener('scroll', update, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', update));
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleLanguage(): void {
    this.language.toggleLanguage();
    this.closeMenu();
  }
}
