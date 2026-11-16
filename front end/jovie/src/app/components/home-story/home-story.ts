import { Component, computed, inject } from '@angular/core';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CxIcon } from '../cx-icon/cx-icon';

const DEFAULT_CORE_VALUES = ['values.quality', 'values.innovation', 'values.integrity', 'values.distributionExcellence', 'values.sustainable'];

/**
 * Home: the reference's lime panel (line-art DNA) beside a short list of the company's existing
 * statements: who we are, mission, vision and core values.
 */
@Component({
  selector: 'app-home-story',
  imports: [TranslatePipe, CxIcon],
  template: `
    <section class="story" aria-labelledby="story-title">
      <div class="story-visual" aria-hidden="true">
        <img src="/assets/images/corporate-v3/dna-hands.webp" alt="" width="1024" height="1024" loading="lazy" />
      </div>
      <div class="story-list">
        <h2 id="story-title" class="visually-hidden">{{ 'values.title' | translate }}</h2>
        <article>
          <h3><app-cx-icon name="story" />{{ 'about.kicker' | translate }}</h3>
          <p>{{ 'about.description' | translate }}</p>
        </article>
        <article>
          <h3><app-cx-icon name="mission" />{{ 'values.missionTitle' | translate }}</h3>
          <p>{{ 'values.missionDescription' | translate }}</p>
        </article>
        <article>
          <h3><app-cx-icon name="vision" />{{ 'values.visionTitle' | translate }}</h3>
          <p>{{ 'values.visionDescription' | translate }}</p>
        </article>
        <article>
          <h3><app-cx-icon name="values" />{{ 'values.coreTitle' | translate }}</h3>
          <p>{{ coreValues() }}</p>
        </article>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      padding-top: var(--cx-section);
    }

    /* Reference proportions: lime panel ~43% (rounded on its inner corners), list on light grey */
    .story {
      display: grid;
      grid-template-columns: minmax(0, 43fr) minmax(0, 57fr);
      background: var(--cx-cloud);
    }

    /* The illustration (hands and DNA) spans the panel; the panel takes the image's own lime so
       the wrists run off the edges without a seam. */
    .story-visual {
      display: flex;
      align-items: center;
      overflow: hidden;
      border-start-end-radius: 10px;
      border-end-end-radius: 10px;
      background: #a7cf52;
    }

    .story-visual img {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 360px;
      object-fit: cover;
    }

    .story-list {
      display: grid;
      align-content: center;
      gap: 20px;
      max-width: 560px;
      padding: 48px clamp(28px, 6vw, 80px);
    }

    h3 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 6px;
      font-size: clamp(22px, 1.9vw, 26px);
      font-weight: 500;
      line-height: 1.2;
    }

    h3 app-cx-icon {
      --cx-icon-size: 18px;
    }

    p {
      margin: 0;
      padding-inline-start: 28px;
      color: var(--cx-slate);
      font-size: 13px;
      line-height: 1.55;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    @media (max-width: 860px) {
      .story {
        grid-template-columns: minmax(0, 1fr);
      }

      .story-visual {
        justify-content: center;
        border-radius: 0;
      }

      .story-visual img {
        width: min(100%, 480px);
      }
    }
  `,
})
export class HomeStory {
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);

  /** The core value names, from the dashboard when available. */
  protected readonly coreValues = computed(() => {
    const remote = this.content.list('values.core');
    const names = remote?.length
      ? remote.map((item) => this.content.pick(item.title))
      : DEFAULT_CORE_VALUES.map((key) => this.language.translate(key));
    return names.join(this.language.currentLanguage() === 'ar' ? '، ' : ', ');
  });
}
