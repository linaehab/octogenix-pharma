import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewEncapsulation, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { AdminHeader } from './components/admin-header';
import { AdminSidebar } from './components/admin-sidebar';

/**
 * Frame of the signed-in dashboard: sidebar, header and the page. Below 1024px the sidebar is a
 * drawer opened from the header (Escape, the backdrop or following a link closes it).
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, TranslatePipe, AdminHeader, AdminSidebar],
  encapsulation: ViewEncapsulation.None,
  host: { '(document:keydown.escape)': 'closeMenu(true)' },
  template: `
    <div class="adm-shell">
      <a class="adm-skip" href="#admin-content">{{ 'admin.skip' | translate }}</a>
      <app-admin-sidebar [open]="menuOpen()" (navigate)="closeMenu(false)" />
      @if (menuOpen()) {
        <div class="adm-backdrop" aria-hidden="true" (click)="closeMenu(false)"></div>
      }
      <div class="adm-body">
        <app-admin-header [menuOpen]="menuOpen()" (menuToggle)="menuOpen.set(!menuOpen())" />
        <main class="adm-content" id="admin-content" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styleUrls: ['./admin-fonts.css', './admin-shell.css', './admin-ui.css'],
})
export class AdminShell {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  protected readonly menuOpen = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const navigation = inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.menuOpen.set(false));
    destroyRef.onDestroy(() => navigation.unsubscribe());

    // The page behind an open drawer does not scroll.
    effect(() => this.document.body.classList.toggle('adm-menu-open', this.menuOpen()));
    destroyRef.onDestroy(() => this.document.body.classList.remove('adm-menu-open'));

    // Widening the window to the desktop layout closes the drawer.
    const wide = this.document.defaultView?.matchMedia?.('(min-width: 1024px)');
    if (wide) {
      const onChange = (event: MediaQueryListEvent) => event.matches && this.menuOpen.set(false);
      wide.addEventListener('change', onChange);
      destroyRef.onDestroy(() => wide.removeEventListener('change', onChange));
    }
  }

  protected closeMenu(returnFocus: boolean): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (returnFocus) {
      this.host.nativeElement.querySelector('.adm-menu-toggle')?.focus();
    }
  }
}
