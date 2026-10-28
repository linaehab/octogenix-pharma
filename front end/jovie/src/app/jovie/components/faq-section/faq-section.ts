import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PhoneLink, contactEmail, contactPhones } from '../../../core/content/contact-details';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { FAQ_CONTENT, FaqGroup } from '../../data/faq-content';

/** A piece of an answer: plain text, or the Octogenix e-mail / phone shown as a link. */
interface AnswerPart {
  kind: 'text' | 'email' | 'phone';
  text: string;
  href?: string;
}

const PLACEHOLDER = /(\{email\}|\{phone\})/;

/**
 * Official Jovie FAQ (content and layout of jovieproducts.com/faq), Egyptian version: one block
 * per group, each question a pale panel that opens in place. {email} and {phone} in the answers
 * are the Octogenix Pharma contact details from the site settings.
 * Home (summary): the first questions and a link to the FAQ page.
 */
@Component({
  selector: 'app-faq-section',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './faq-section.html',
  styleUrl: './faq-section.css',
})
export class FaqSection {
  private readonly language = inject(LanguageService);
  private readonly content = inject(SiteContentService);

  readonly summary = input(false);

  protected readonly groups = computed(() => {
    const email = contactEmail(this.content);
    const phone: PhoneLink | undefined = contactPhones(this.content)[0];
    const toParts = (answer: string): AnswerPart[] =>
      answer
        .split(PLACEHOLDER)
        .filter((text) => text)
        .map((text): AnswerPart => {
          if (text === '{email}') {
            return { kind: 'email', text: email };
          }
          if (text === '{phone}') {
            return phone ? { kind: 'phone', text: phone.label, href: phone.href } : { kind: 'text', text: '' };
          }
          return { kind: 'text', text };
        });

    const groups: FaqGroup[] = FAQ_CONTENT[this.language.currentLanguage()];
    const shown = this.summary() ? [{ ...groups[0], items: groups[0].items.slice(0, 3) }] : groups;
    return shown.map((group) => ({
      title: group.title,
      items: group.items.map((item) => ({ question: item.question, answer: toParts(item.answer) })),
    }));
  });
}
