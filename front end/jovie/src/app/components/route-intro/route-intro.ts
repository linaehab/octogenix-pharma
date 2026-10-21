import { Component, input } from '@angular/core';
import { HomeBanner } from '../home-banner/home-banner';

export type RouteIntroVariant = 'about' | 'services' | 'brands' | 'contact';

@Component({
  selector: 'app-route-intro',
  imports: [HomeBanner],
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
