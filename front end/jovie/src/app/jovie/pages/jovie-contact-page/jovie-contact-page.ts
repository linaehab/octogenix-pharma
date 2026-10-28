import { Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BlobImage } from '../../components/blob-image/blob-image';
import { DecorShape } from '../../components/decor-shape/decor-shape';
import { JovieContactForm } from '../../components/jovie-contact-form/jovie-contact-form';

/** /jovie/contact: the Octogenix contact page pattern (intro, then details + form) in Jovie's identity. */
@Component({
  selector: 'app-jovie-contact-page',
  imports: [TranslatePipe, BlobImage, DecorShape, JovieContactForm],
  template: `
    <section class="intro" aria-labelledby="jovie-contact-title">
      <app-decor-shape class="flower" shape="cloud-lightblue" tone="pale" />
      <app-decor-shape class="ring" shape="ring-red" />
      <div class="jv-container layout">
        <div>
          <p class="jv-eyebrow">{{ 'jovie.contact.kicker' | translate }}</p>
          <h1 id="jovie-contact-title" class="jv-title">{{ 'jovie.contact.title' | translate }}</h1>
          <p class="jv-lead">{{ 'jovie.contact.description' | translate }}</p>
        </div>
        <app-blob-image class="blob-2" src="/assets/images/jovie/contact-happy-baby.jpg"
          [alt]="'jovie.contact.imageAlt' | translate" [eager]="true" />
      </div>
    </section>
    <app-jovie-contact-form />
  `,
  styles: `
    .intro { position: relative; overflow: hidden; padding-block: calc(var(--jv-header-height) + clamp(1rem, 3vw, 2rem)) clamp(2.5rem, 6vw, 4.5rem); background: var(--jv-sunshine); }
    .jv-eyebrow { color: var(--jv-night); }
    .layout { position: relative; display: grid; grid-template-columns: 1.3fr 1fr; align-items: center; gap: 2rem; }
    app-blob-image { max-width: 22rem; width: 100%; margin-inline-start: auto; border: 6px solid var(--jv-white); }
    .flower { position: absolute; bottom: -2.5rem; inset-inline-start: 38%; width: 8rem; color: var(--jv-white); opacity: 0.35; }
    .ring { position: absolute; top: 1.5rem; inset-inline-end: 3%; width: 4.5rem; color: var(--jv-sweetypie); }
    @media (max-width: 699px) { .layout { grid-template-columns: 1fr; } app-blob-image { margin-inline: auto; max-width: 16rem; } }
  `,
})
export class JovieContactPage {}
