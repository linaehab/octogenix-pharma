import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { WorldMap } from '../world-map/world-map';

/** Home summary of "Where to find": short text, the (static) world map and a link to the page. */
@Component({
  selector: 'app-where-to-find',
  imports: [RouterLink, TranslatePipe, WorldMap],
  template: `
    <section id="where-to-find" class="jv-section where" aria-labelledby="jovie-where-title">
      <div class="jv-container layout">
        <div>
          <p class="jv-eyebrow">{{ 'jovie.where.kicker' | translate }}</p>
          <h2 id="jovie-where-title" class="jv-title">{{ 'jovie.where.title' | translate }}</h2>
          <p class="jv-lead">{{ 'jovie.where.description' | translate }}</p>
          <a class="jv-button jv-button--light" routerLink="/jovie/where-to-find">{{ 'jovie.where.findCta' | translate }}</a>
        </div>
        <app-world-map [interactive]="false" />
      </div>
    </section>
  `,
  styles: `
    .where { background: var(--jv-map-sea); color: var(--jv-white); }
    .jv-eyebrow { color: var(--jv-sunshine); }
    .layout { display: grid; grid-template-columns: 0.8fr 1.4fr; align-items: center; gap: clamp(2rem, 5vw, 4rem); }
    @media (max-width: 899px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class WhereToFind {}
