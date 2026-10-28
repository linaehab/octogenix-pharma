import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteFooter } from '../../components/site-footer/site-footer';
import { SiteHeader } from '../../components/site-header/site-header';

/** Octogenix corporate pages: the header and footer previously placed in app.html. */
@Component({
  selector: 'app-corporate-layout',
  imports: [RouterOutlet, SiteHeader, SiteFooter],
  template: `
    <app-site-header />
    <main class="route-content">
      <router-outlet />
    </main>
    <app-site-footer />
  `,
  styles: ':host { display: block; }',
})
export class CorporateLayout {}
