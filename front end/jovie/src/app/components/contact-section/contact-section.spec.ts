import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactSection } from './contact-section';

describe('ContactSection', () => {
  let component: ContactSection;
  let fixture: ComponentFixture<ContactSection>;
  let http: HttpTestingController;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactSection],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactSection);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const setValue = (selector: string, value: string) => {
    const input = compiled.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
    if (!input) {
      throw new Error(`Missing form field: ${selector}`);
    }
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
    fixture.detectChanges();
  };

  const fillValidForm = () => {
    setValue('#first-name', 'Alex');
    setValue('#last-name', 'Doe');
    setValue('#email', 'alex@example.com');
    setValue('#phone', '01012345678');
    setValue('#subject', 'import-export');
    setValue('#message', 'Hello');
  };

  const submit = () => {
    compiled.querySelector<HTMLButtonElement>('.button-submit')?.click();
    fixture.detectChanges();
  };

  /** Answers the CSRF cookie request and returns the pending message request. */
  const expectSend = () => {
    http.expectOne('/sanctum/csrf-cookie').flush(null, { status: 204, statusText: 'No Content' });
    return http.expectOne('/api/v1/contact-messages');
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the current contact details until settings are loaded', () => {
    const details = compiled.querySelector('.contact-details')?.textContent ?? '';
    expect(details).toContain('+20 109 007 5087');
    expect(details).toContain('+20 57 207 0371');
    expect(details).toContain('info@octogenixpharma.com');
  });

  it('should show required-field errors when submitted empty and send nothing', () => {
    submit();

    expect(compiled.textContent).toContain('This field is required.');
    expect(compiled.querySelector('#first-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(compiled.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    expect(compiled.querySelector('#message')?.getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/sanctum/csrf-cookie');
  });

  it('should validate the email before sending', () => {
    fillValidForm();
    setValue('#email', 'invalid-email');
    submit();

    expect(compiled.textContent).toContain('Enter a valid email address.');
    http.expectNone('/sanctum/csrf-cookie');
  });

  it('sends the message to the API and confirms it', () => {
    fillValidForm();
    submit();

    expect(compiled.querySelector<HTMLButtonElement>('.button-submit')?.disabled).toBeTrue();
    const request = expectSend();
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      first_name: 'Alex',
      last_name: 'Doe',
      email: 'alex@example.com',
      phone: '01012345678',
      subject: 'import-export',
      message: 'Hello',
      website: '',
      site: 'corporate',
      locale: 'en',
    });

    request.flush({ message: 'Your message has been received.' }, { status: 201, statusText: 'Created' });
    fixture.detectChanges();

    expect(compiled.querySelector('.form-status--success')?.textContent).toContain('Your message has been sent');
    expect(compiled.querySelector<HTMLInputElement>('#first-name')?.value).toBe('');
  });

  it('explains rate limiting and keeps what the visitor typed', () => {
    fillValidForm();
    submit();
    expectSend().flush({ message: 'Too Many Attempts.' }, { status: 429, statusText: 'Too Many Requests' });
    fixture.detectChanges();

    expect(compiled.querySelector('.form-status--error')?.textContent).toContain('try again in a few minutes');
    expect(compiled.querySelector<HTMLInputElement>('#first-name')?.value).toBe('Alex');
    expect(compiled.querySelector<HTMLButtonElement>('.button-submit')?.disabled).toBeFalse();
  });

  it('reports rejected details and network failures', () => {
    fillValidForm();
    submit();
    expectSend().flush({ errors: { phone: ['invalid'] } }, { status: 422, statusText: 'Unprocessable Content' });
    fixture.detectChanges();
    expect(compiled.querySelector('.form-status--error')?.textContent).toContain('review the form');

    submit();
    http.expectOne('/sanctum/csrf-cookie').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(compiled.querySelector('.form-status--error')?.textContent).toContain('contact us by phone or email');
  });
});
