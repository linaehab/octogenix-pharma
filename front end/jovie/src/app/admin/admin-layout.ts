import { Component, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../core/i18n/language.service';
import { adminTranslations } from './admin-translations';

/** The admin area's own fonts (sign-in pages; --sans in styles.css), loaded only when it opens. */
export const ADMIN_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700&family=Nunito+Sans:wght@400;500;600;700;800&display=swap';

/**
 * Root of the admin area (/admin): registers its texts and fonts and asks search engines not to
 * index it. The sign-in pages are framed by AdminAuthFrame, the signed-in dashboard by AdminShell.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="adm">
      <router-outlet />
    </div>
  `,
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  constructor() {
    inject(LanguageService).addTranslations(adminTranslations);
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
    linkAdminFonts(inject(DOCUMENT));
  }
}

/** Adds the admin fonts stylesheet once (the public site and the store do not use these fonts). */
function linkAdminFonts(document: Document): void {
  if (document.head.querySelector(`link[href="${ADMIN_FONTS_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ADMIN_FONTS_HREF;
  document.head.appendChild(link);
}
