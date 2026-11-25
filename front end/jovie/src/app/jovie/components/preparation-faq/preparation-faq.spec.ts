import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { PREPARATION_FAQ } from '../../data/preparation-faq';
import { PreparationFaq, answerParts } from './preparation-faq';

describe('answerParts', () => {
  it('splits plain, bold and italic runs', () => {
    expect(answerParts('Use **one scoop** *before* mixing.')).toEqual([
      { text: 'Use ', style: 'plain' },
      { text: 'one scoop', style: 'bold' },
      { text: ' ', style: 'plain' },
      { text: 'before', style: 'italic' },
      { text: ' mixing.', style: 'plain' },
    ]);
  });
});

describe('PreparationFaq', () => {
  const render = () => {
    const fixture = TestBed.createComponent(PreparationFaq);
    fixture.detectChanges();
    return fixture;
  };

  it('shows the six questions in order, closed, with bold answer text', () => {
    const el = render().nativeElement as HTMLElement;
    const questions = [...el.querySelectorAll('.question')].map((q) => q.textContent!.trim());
    expect(questions).toEqual(PREPARATION_FAQ.en.items.map((item) => item.question));
    expect(el.querySelector('h2')!.textContent!.trim()).toBe('How To Prepare Formula');
    expect(el.querySelectorAll('details[open]').length).toBe(0);
    expect(el.querySelector('.answer strong')!.textContent).toBe('one level scoop of Jovie powder for every 30 ml of water');
    expect(el.textContent).not.toContain('**');
  });

  it('opens and closes an answer from its question', () => {
    const el = render().nativeElement as HTMLElement;
    const item = el.querySelector('details') as HTMLDetailsElement;
    item.querySelector('summary')!.click();
    expect(item.open).toBeTrue();
    item.querySelector('summary')!.click();
    expect(item.open).toBeFalse();
  });

  it('follows the language', () => {
    TestBed.inject(LanguageService).setLanguage('ar');
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')!.textContent!.trim()).toBe(PREPARATION_FAQ.ar.title);
    expect(el.querySelector('.question')!.textContent!.trim()).toBe(PREPARATION_FAQ.ar.items[0].question);
    TestBed.inject(LanguageService).setLanguage('en');
  });
});
