import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactMessageService } from '../../../core/contact/contact-message.service';
import { contactEmail, contactPhones } from '../../../core/content/contact-details';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Same behaviour as the Octogenix contact form (validation, honeypot, CSRF, error messages),
 * sent with site "jovie" so the dashboard can tell the two apart.
 */
@Component({
  selector: 'app-jovie-contact-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './jovie-contact-form.html',
  styleUrl: './jovie-contact-form.css',
})
export class JovieContactForm {
  private readonly formBuilder = inject(FormBuilder);
  private readonly contactMessages = inject(ContactMessageService);
  private readonly language = inject(LanguageService);
  private readonly content = inject(SiteContentService);

  protected readonly phones = computed(() => contactPhones(this.content));
  protected readonly email = computed(() => contactEmail(this.content));

  /** Values accepted by the API (ContactSubject); labels are Jovie-specific. */
  protected readonly subjects = [
    { value: 'general', label: 'jovie.contact.subjectGeneral' },
    { value: 'distribution', label: 'jovie.contact.subjectStockists' },
    { value: 'partnership', label: 'jovie.contact.subjectPartnership' },
    { value: 'other', label: 'contact.subjectOther' },
  ];

  protected readonly status = signal<SendStatus>('idle');
  protected readonly errorKey = signal('contact.errorGeneric');

  protected readonly contactForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: [''],
    message: ['', Validators.required],
    website: [''],
  });

  protected get firstName() {
    return this.contactForm.controls.firstName;
  }

  protected get emailControl() {
    return this.contactForm.controls.email;
  }

  protected get message() {
    return this.contactForm.controls.message;
  }

  protected submitMessage(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid || this.status() === 'sending') {
      return;
    }

    this.status.set('sending');
    this.contactMessages
      .send(this.contactForm.getRawValue(), this.language.currentLanguage(), 'jovie')
      .subscribe({
        next: () => {
          this.status.set('sent');
          this.contactForm.reset();
        },
        error: (error: HttpErrorResponse) => {
          this.errorKey.set(
            error.status === 422
              ? 'contact.errorValidation'
              : error.status === 429
                ? 'contact.errorRateLimited'
                : 'contact.errorGeneric',
          );
          this.status.set('error');
        },
      });
  }
}
