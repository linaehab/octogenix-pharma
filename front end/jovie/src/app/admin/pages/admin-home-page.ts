import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';

/**
 * /admin — the signed-in admin's starting page. The dashboard screens (products, orders, reviews…)
 * are not built yet; their API is ready and protected by the admin guard and permissions.
 */
@Component({
  selector: 'app-admin-home-page',
  imports: [TranslatePipe],
  template: `
    @if (auth.admin(); as a) {
      <section class="adm-card is-wide" aria-labelledby="adm-home-title">
        <h1 id="adm-home-title">{{ 'admin.home.title' | translate: { name: a.name } }}</h1>
        <p class="adm-lead">{{ 'admin.home.lead' | translate }}</p>
        <dl class="adm-facts">
          <dt>{{ 'account.field.email' | translate }}</dt><dd dir="ltr">{{ a.email }}</dd>
          <dt>{{ 'admin.home.role' | translate }}</dt><dd>{{ ('admin.role.' + a.role) | translate }}</dd>
          @if (lastLogin(); as l) {
            <dt>{{ 'admin.home.lastLogin' | translate }}</dt><dd>{{ l }}</dd>
          }
        </dl>
        <h2>{{ 'admin.home.permissions' | translate }}</h2>
        <ul class="adm-chips">
          @for (p of a.permissions; track p) {
            <li dir="ltr">{{ p }}</li>
          }
        </ul>
        <p class="adm-notice">{{ 'admin.home.comingSoon' | translate }}</p>
        <button type="button" class="adm-button is-light" [disabled]="loggingOut()" (click)="logout()">{{ 'account.nav.logout' | translate }}</button>
      </section>
    }
  `,
  styles: `
    h2 {
      margin: 0 0 0.6rem;
      font-size: 1.1rem;
    }
  `,
})
export class AdminHomePage {
  protected readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);
  protected readonly loggingOut = signal(false);

  protected readonly lastLogin = computed(() => {
    const value = this.auth.admin()?.last_login_at;
    return value
      ? new Intl.DateTimeFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(new Date(value))
      : null;
  });

  protected logout(): void {
    this.loggingOut.set(true);
    this.auth.logout().subscribe({ complete: () => this.router.navigateByUrl('/admin/login') });
  }
}
