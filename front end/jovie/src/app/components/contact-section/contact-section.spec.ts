import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactSection } from './contact-section';

describe('ContactSection', () => {
  let component: ContactSection;
  let fixture: ComponentFixture<ContactSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show required-field errors when submitted empty', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('.button-submit')?.click();
    fixture.detectChanges();

    expect(compiled.textContent).toContain('This field is required.');
    expect(compiled.querySelector('#first-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(compiled.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    expect(compiled.querySelector('#message')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('should validate email and disclose that sending is not configured', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const setValue = (selector: string, value: string) => {
      const input = compiled.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
      if (!input) {
        throw new Error(`Missing form field: ${selector}`);
      }
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };

    setValue('#first-name', 'Alex');
    setValue('#email', 'invalid-email');
    setValue('#message', 'Hello');
    compiled.querySelector<HTMLButtonElement>('.button-submit')?.click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('Enter a valid email address.');

    setValue('#email', 'alex@example.com');
    compiled.querySelector<HTMLButtonElement>('.button-submit')?.click();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('nothing has been sent');
  });
});
