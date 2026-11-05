import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, afterNextRender, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CartService } from '../../store/cart.service';
import { AccountMenu } from './account-menu';

/** Jovie store pages, in navigation order (Shop first). */
export const JOVIE_NAV = [
  { path: '/jovie/shop', label: 'jovie.nav.shop' },
  { path: '/jovie/why', label: 'jovie.nav.why' },
  { path: '/jovie/products', label: 'jovie.nav.products' },
  { path: '/jovie/feeding-guide', label: 'jovie.nav.feedingGuide' },
  { path: '/jovie/where-to-find', label: 'jovie.nav.whereToFind' },
  { path: '/jovie/faq', label: 'jovie.nav.faq' },
] as const;

/** Colour of the solid header, from the route's `headerTone` data (default yellow). */
export type HeaderTone = 'yellow' | 'navy' | 'red' | 'green' | 'pink' | 'blue';

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
  imports: [RouterLink, RouterLinkActive, TranslatePipe, AccountMenu],
  templateUrl: './jovie-header.html',
  styleUrls: ['./jovie-header.css', './jovie-header-menu.css'],
})
export class JovieHeader {
  protected readonly language = inject(LanguageService);
  protected readonly cart = inject(CartService);
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
      // The phone menu covers the screen: Escape closes it, and it closes when the window becomes desktop wide.
      const onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.isMenuOpen()) {
          this.closeMenu();
          document.querySelector<HTMLElement>('.menu-toggle')?.focus();
        }
      };
      const desktop = window.matchMedia('(min-width: 1024px)');
      const onDesktop = () => desktop.matches && this.closeMenu();
      window.addEventListener('keydown', onKey);
      desktop.addEventListener('change', onDesktop);
      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', update);
        window.removeEventListener('keydown', onKey);
        desktop.removeEventListener('change', onDesktop);
        document.body.classList.remove('jv-menu-open');
      });
    });

    // Like the official site, the page behind the open menu does not scroll.
    effect(() => document.body.classList.toggle('jv-menu-open', this.isMenuOpen()));
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
