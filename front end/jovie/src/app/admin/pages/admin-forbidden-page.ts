import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** /admin/forbidden — where the route guard sends an admin who opens a section their role does not include. */
@Component({
  selector: 'app-admin-forbidden-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <section class="adm-panel adm-forbidden" aria-labelledby="adm-forbidden-title">
      <p class="adm-code" aria-hidden="true">403</p>
      <h1 id="adm-forbidden-title">{{ 'admin.forbidden.title' | translate }}</h1>
      <p class="adm-panel-lead">{{ 'admin.forbidden.text' | translate }}</p>
      <a class="adm-button" routerLink="/admin">{{ 'admin.forbidden.back' | translate }}</a>
    </section>
  `,
  styles: `
    .adm-forbidden {
      max-width: 40rem;
    }

    .adm-forbidden h1 {
      margin: 0 0 0.5rem;
      color: var(--adm-navy);
      font-size: 1.6rem;
    }

    .adm-code {
      margin: 0;
      color: var(--adm-red);
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1;
    }
  `,
})
export class AdminForbiddenPage {}
