import { Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { WorldMap } from '../../components/world-map/world-map';

/** /jovie/where-to-find: the official full-page map, with Egypt as the available market. */
@Component({
  selector: 'app-jovie-where-page',
  imports: [TranslatePipe, WorldMap],
  template: `
    <section class="where" aria-labelledby="jovie-page-title">
      <h1 id="jovie-page-title" class="visually-hidden">{{ 'jovie.page.where.title' | translate }}</h1>
      <div class="jv-container wide">
        <app-world-map />
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .where { min-height: 100vh; padding-block: calc(var(--jv-header-height) + clamp(1.5rem, 5vw, 4rem)) clamp(2.5rem, 6vw, 4rem); background: var(--jv-map-sea); }
    .wide { width: min(80rem, 100% - 2rem); }
    .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  `,
})
export class JovieWherePage {}
