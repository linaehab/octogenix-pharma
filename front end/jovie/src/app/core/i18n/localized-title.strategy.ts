import { Injectable, inject } from '@angular/core';
import { TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { LanguageService } from './language.service';

@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly language = inject(LanguageService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    // Pages sit inside layout routes, so join the paths of the whole branch:
    // '' + 'about' → 'about', 'jovie' + '' → 'jovie', 'jovie' + 'contact' → 'jovie/contact'.
    const segments: string[] = [];
    for (let route = snapshot.root.firstChild; route; route = route.firstChild) {
      if (route.routeConfig?.path) {
        segments.push(route.routeConfig.path);
      }
    }
    const routePath = segments.join('/') || 'home';
    const fallbackTitle = this.buildTitle(snapshot) ?? 'Octogenix Pharma';
    this.language.setRouteTitle(`title.${routePath}`, fallbackTitle);
  }
}
