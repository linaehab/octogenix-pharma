import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../core/i18n/language.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';

/** Frame of the admin sign-in pages (log in, forgot and set password): the Octogenix name and the language switch. */
@Component({
  selector: 'app-admin-auth-frame',
  imports: [RouterOutlet, TranslatePipe],
  template: `
    <header class="adm-top">
      <p class="adm-brand">Octogenix <span>{{ 'admin.brand' | translate }}</span></p>
      <button type="button" class="adm-lang" (click)="language.toggleLanguage()"
        [attr.lang]="language.currentLanguage() === 'en' ? 'ar' : 'en'">{{ 'admin.switchLanguage' | translate }}</button>
    </header>
    <main class="adm-main" id="admin-main">
      <router-outlet />
    </main>
  `,
})
export class AdminAuthFrame {
  protected readonly language = inject(LanguageService);
}
