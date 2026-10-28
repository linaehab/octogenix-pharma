import { ViewportScroller } from '@angular/common';
import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { JovieFooter } from '../components/jovie-footer/jovie-footer';
import { JovieHeader } from '../components/jovie-header/jovie-header';
import { JovieIntroDialog } from '../intro-dialog/intro-dialog';
import { JovieMasks } from '../components/jovie-masks/jovie-masks';
import { jovieTranslations } from '../jovie-translations';

/**
 * Shell of the Jovie store (/jovie/...), loaded lazily. Registers the Jovie texts, and its
 * stylesheet is not encapsulated: it defines the Jovie brand tokens and the shared primitives
 * (container, section headings, buttons), all scoped to app-jovie-layout so the Octogenix pages
 * are unaffected.
 */
@Component({
  selector: 'app-jovie-layout',
  imports: [RouterOutlet, TranslatePipe, JovieHeader, JovieFooter, JovieIntroDialog, JovieMasks],
  templateUrl: './jovie-layout.html',
  styleUrl: './jovie-layout.css',
  encapsulation: ViewEncapsulation.None,
})
export class JovieLayout {
  constructor() {
    inject(LanguageService).addTranslations(jovieTranslations);
    // Anchor links (#fat, ...) land below the sticky header instead of under it.
    inject(ViewportScroller).setOffset([0, 112]);
  }
}
