import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminAuthService } from '../admin-auth.service';
import { ADMIN_SECTIONS } from '../admin-sections';

/**
 * Dashboard navigation: only the sections the signed-in admin may open. On phones and tablets it
 * is a drawer (`open`); from 1024px it stays beside the page.
 */
@Component({
  selector: 'app-admin-sidebar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav class="adm-side" id="admin-sidebar" [class.is-open]="open()" [attr.aria-label]="'admin.nav.label' | translate">
      <div class="adm-side-brand">
        <img src="/assets/images/jovie/logo-official-white.png" alt="Jovie" width="56" height="56" />
        <p>Octogenix <span>{{ 'admin.brand' | translate }}</span></p>
      </div>
      @if (auth.admin(); as a) {
        <p class="adm-side-user">{{ a.name }} <span>{{ ('admin.role.' + a.role) | translate }}</span></p>
      }
      <ul>
        @for (section of sections(); track section.key) {
          <li>
            <a [routerLink]="'/admin/' + section.path" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: section.path === '' }"
              #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null" (click)="navigate.emit()">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path [attr.d]="section.icon" /></svg>
              <span>{{ ('admin.nav.' + section.key) | translate }}</span>
              @if (section.planned) {
                <small class="adm-soon">{{ 'admin.nav.soon' | translate }}</small>
              }
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class AdminSidebar {
  protected readonly auth = inject(AdminAuthService);
  readonly open = input(false);
  /** A link was followed (closes the drawer on small screens). */
  readonly navigate = output<void>();

  protected readonly sections = computed(() => {
    // Read the admin signal so the list follows sign-in changes.
    this.auth.admin();
    return ADMIN_SECTIONS.filter((section) => this.auth.can(section.access));
  });
}
