import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../../core/i18n/language.service';
import { jovieTranslations } from '../../jovie-translations';
import { JovieContactForm } from './jovie-contact-form';

describe('JovieContactForm', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [JovieContactForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const language = TestBed.inject(LanguageService);
    language.addTranslations(jovieTranslations);
    language.setLanguage('en');
  });

  afterEach(() => http.verify());

  const fill = (element: HTMLElement, id: string, value: string) => {
    const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
  };

  it('does not send an incomplete form', () => {
    const fixture = TestBed.createComponent(JovieContactForm);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('.error').length).toBe(3);
    http.expectNone('/api/v1/contact-messages');
  });

  it('sends the message as a Jovie message and confirms it', () => {
    const fixture = TestBed.createComponent(JovieContactForm);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    fill(element, 'jv-first-name', 'Mona');
    fill(element, 'jv-email', 'mona@example.com');
    fill(element, 'jv-subject', 'distribution');
    fill(element, 'jv-message', 'Which pharmacies stock Jovie?');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();

    http.expectOne('/sanctum/csrf-cookie').flush(null);
    const post = http.expectOne('/api/v1/contact-messages');
    expect(post.request.body).toEqual(
      jasmine.objectContaining({ first_name: 'Mona', subject: 'distribution', site: 'jovie', locale: 'en' }),
    );
    post.flush({}, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Thank you');
  });
});
