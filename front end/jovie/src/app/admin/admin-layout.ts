import { Component, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../core/i18n/language.service';
import { adminTranslations } from './admin-translations';

/**
 * Root of the admin area (/admin): registers its texts and asks search engines not to index it.
 * The sign-in pages are framed by AdminAuthFrame, the signed-in dashboard by AdminShell.
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
  }
}
