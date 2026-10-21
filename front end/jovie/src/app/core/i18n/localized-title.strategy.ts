import { Injectable, inject } from '@angular/core';
import { TitleStrategy, RouterStateSnapshot } from '@angular/router';
import { LanguageService } from './language.service';

@Injectable()
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly language = inject(LanguageService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routePath = snapshot.root.firstChild?.routeConfig?.path || 'home';
    const fallbackTitle = this.buildTitle(snapshot) ?? 'Octogenix Pharma';
    this.language.setRouteTitle(`title.${routePath}`, fallbackTitle);
  }
}
