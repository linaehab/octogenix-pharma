import { Component, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../core/i18n/language.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { adminTranslations } from './admin-translations';

/**
 * Frame of the admin area (/admin): the Octogenix name, the language switch and the page. Kept
 * apart from the corporate site and the Jovie store; search engines are asked not to index it.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, TranslatePipe],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="adm">
      <header class="adm-top">
        <p class="adm-brand">Octogenix <span>{{ 'admin.brand' | translate }}</span></p>
        <button type="button" class="adm-lang" (click)="language.toggleLanguage()"
          [attr.lang]="language.currentLanguage() === 'en' ? 'ar' : 'en'">{{ 'admin.switchLanguage' | translate }}</button>
      </header>
      <main class="adm-main" id="admin-main">
        <router-outlet />
      </main>
    </div>
  `,
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  protected readonly language = inject(LanguageService);

  constructor() {
    this.language.addTranslations(adminTranslations);
    const meta = inject(Meta);
    meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    inject(DestroyRef).onDestroy(() => meta.removeTag("name='robots'"));
  }
}
