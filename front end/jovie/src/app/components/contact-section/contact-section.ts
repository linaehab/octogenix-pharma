import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactMessageService } from '../../core/contact/contact-message.service';
import { contactEmail, contactPhones } from '../../core/content/contact-details';
import { SiteContentService } from '../../core/content/site-content.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-contact-section',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.css',
})
export class ContactSection {
  private readonly formBuilder = inject(FormBuilder);
  private readonly contactMessages = inject(ContactMessageService);
  private readonly language = inject(LanguageService);
  protected readonly content = inject(SiteContentService);

  protected readonly phones = computed(() => contactPhones(this.content));
  protected readonly email = computed(() => contactEmail(this.content));

  protected readonly status = signal<SendStatus>('idle');
  /** Translation key of the error shown when status is 'error'. */
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
    this.contactMessages.send(this.contactForm.getRawValue(), this.language.currentLanguage()).subscribe({
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
