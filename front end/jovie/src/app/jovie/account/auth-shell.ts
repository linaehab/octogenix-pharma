import { Component, ViewEncapsulation, input } from '@angular/core';
import { DecorShape } from '../components/decor-shape/decor-shape';

/**
 * Frame of the sign-in pages (log in, sign up, forgot / reset password, verify email): the Jovie
 * yellow band under the header with the official decorative shapes, and a white card holding the
 * page's form. Also loads the account form styles (unencapsulated, scoped to .jv-form).
 */
@Component({
  selector: 'app-auth-shell',
  imports: [DecorShape],
  encapsulation: ViewEncapsulation.None,
  template: `
    <section class="auth-shell">
      <app-decor-shape class="auth-shell__shape auth-shell__shape--a" shape="cloud-lightblue" />
      <app-decor-shape class="auth-shell__shape auth-shell__shape--b" shape="circle-leaves-red-green" />
      <app-decor-shape class="auth-shell__shape auth-shell__shape--c" shape="snowflake-red" />
      <div class="auth-shell__card">
        <h1 class="auth-shell__title" [id]="titleId()">{{ title() }}</h1>
        @if (lead()) {
          <p class="auth-shell__lead">{{ lead() }}</p>
        }
        <ng-content />
      </div>
    </section>
  `,
  styleUrls: ['./account-forms.css', './auth-shell.css'],
})
export class AuthShell {
  readonly title = input.required<string>();
  readonly lead = input('');
  readonly titleId = input('auth-title');
}
