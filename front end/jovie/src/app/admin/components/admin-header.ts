import { Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { AdminNotificationBell } from './admin-notification-bell';

/** Dashboard header: menu button (phones and tablets), language switch, the signed-in admin and log out. */
@Component({
  selector: 'app-admin-header',
  imports: [TranslatePipe, AdminNotificationBell],
  template: `
    <header class="adm-head">
      <button type="button" class="adm-menu-toggle" aria-controls="admin-sidebar" [attr.aria-expanded]="menuOpen()"
        [attr.aria-label]="(menuOpen() ? 'admin.nav.close' : 'admin.nav.open') | translate" (click)="menuToggle.emit()">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          @if (menuOpen()) {
            <path d="M6 6l12 12M18 6L6 18" />
          } @else {
            <path d="M4 7h16M4 12h16M4 17h16" />
          }
        </svg>
      </button>
      <p class="adm-head-title">{{ 'admin.header.title' | translate }}</p>
      <div class="adm-head-actions">
        <app-admin-notification-bell />
        <button type="button" class="adm-head-button" (click)="language.toggleLanguage()"
          [attr.lang]="language.currentLanguage() === 'en' ? 'ar' : 'en'">{{ 'admin.switchLanguage' | translate }}</button>
        @if (auth.admin(); as a) {
          <p class="adm-user">
            <span class="adm-user-name">{{ a.name }}</span>
            <span class="adm-user-role">{{ ('admin.role.' + a.role) | translate }}</span>
          </p>
        }
        <button type="button" class="adm-head-button is-strong" [disabled]="loggingOut()" [attr.aria-busy]="loggingOut()" (click)="logout()">
          {{ 'account.nav.logout' | translate }}
        </button>
      </div>
    </header>
  `,
})
export class AdminHeader {
  protected readonly auth = inject(AdminAuthService);
  protected readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();
  protected readonly loggingOut = signal(false);

  protected logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    // The existing sign-out: always ends locally, even when the request fails.
    this.auth.logout().subscribe({
      complete: () => {
        this.loggingOut.set(false);
        void this.router.navigateByUrl('/admin/login');
      },
    });
  }
}
