import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { PREPARATION_FAQ } from '../../data/preparation-faq';
import { DecorShape } from '../decor-shape/decor-shape';

/** A run of answer text, plain, bold (**…**) or italic (*…*). */
export interface AnswerPart {
  text: string;
  style: 'plain' | 'bold' | 'italic';
}

/** Splits an answer into plain, **bold** and *italic* runs. */
export function answerParts(answer: string): AnswerPart[] {
  return answer
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
    .filter((text) => text)
    .map((text): AnswerPart => {
      if (text.startsWith('**') && text.endsWith('**')) return { text: text.slice(2, -2), style: 'bold' };
      if (text.startsWith('*') && text.endsWith('*')) return { text: text.slice(1, -1), style: 'italic' };
      return { text, style: 'plain' };
    });
}

/**
 * Feeding guide page, after the feeding chart: "How To Prepare Formula", after the client's
 * reference — the title in the start column and the questions in a ruled list beside it, each
 * opening in place with a plus that turns into a cross. Below 900px the title sits above the list.
 */
@Component({
  selector: 'app-preparation-faq',
  imports: [DecorShape],
  template: `
    <section class="jv-section prep" aria-labelledby="jovie-prep-title">
      <div class="jv-container layout">
        <div class="side">
          <h2 id="jovie-prep-title" class="title">{{ faq().title }}</h2>
          <div class="decor" aria-hidden="true">
            <app-decor-shape class="decor-cloud" shape="cloud-lightblue" />
            <app-decor-shape class="decor-ring" shape="striped-circle-lightblue" />
            <app-decor-shape class="decor-leaves" shape="leaves-green" />
          </div>
        </div>
        <div class="list">
          @for (item of faq().items; track $index) {
            <details class="item">
              <summary>
                <span class="question">{{ item.question }}</span>
                <span class="icon" aria-hidden="true"></span>
              </summary>
              <p class="answer">
                @for (part of item.answer; track $index) {@switch (part.style) {@case ('bold') {<strong>{{ part.text }}</strong>}@case ('italic') {<em>{{ part.text }}</em>}@default {<span>{{ part.text }}</span>}}}
              </p>
            </details>
          }
        </div>
      </div>
    </section>
  `,
  styleUrl: './preparation-faq.css',
})
export class PreparationFaq {
  private readonly language = inject(LanguageService);

  protected readonly faq = computed(() => {
    const faq = PREPARATION_FAQ[this.language.currentLanguage()];
    return { title: faq.title, items: faq.items.map((item) => ({ question: item.question, answer: answerParts(item.answer) })) };
  });
}
