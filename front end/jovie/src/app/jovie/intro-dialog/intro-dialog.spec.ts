import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/i18n/language.service';
import { jovieTranslations } from '../jovie-translations';
import { JovieIntroDialog } from './intro-dialog';
import { IntroDialogService } from './intro-dialog.service';

describe('JovieIntroDialog', () => {
  const key = IntroDialogService.STORAGE_KEY;

  beforeEach(() => sessionStorage.removeItem(key));
  afterEach(() => sessionStorage.removeItem(key));

  const render = async () => {
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
    const fixture = TestBed.createComponent(JovieIntroDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    return { fixture, dialog };
  };

  it('opens as a modal on the first visit of the session', async () => {
    const { dialog, fixture } = await render();

    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Breast milk is the best for your child');
    fixture.destroy();
  });

  it('is dismissed by its button and stays hidden for the session', async () => {
    const { dialog, fixture } = await render();

    dialog.querySelector('button')!.click();
    await new Promise((resolve) => setTimeout(resolve));

    expect(dialog.open).toBe(false);
    expect(sessionStorage.getItem(key)).toBe('1');
    fixture.destroy();

    const second = await render();
    expect(second.dialog.open).toBe(false);
    second.fixture.destroy();
  });
});
