import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type RouteIntroVariant = 'about' | 'services' | 'brands' | 'contact';

@Component({
  selector: 'app-route-intro',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './route-intro.html',
  styleUrl: './route-intro.css',
})
export class RouteIntro {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly image = input.required<string>();
  readonly imageAlt = input.required<string>();
  readonly variant = input.required<RouteIntroVariant>();
}
