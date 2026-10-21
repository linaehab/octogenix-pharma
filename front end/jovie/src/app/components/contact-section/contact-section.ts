import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-contact-section',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.css',
})
export class ContactSection {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly showIntegrationNotice = signal(false);
  protected readonly contactForm = this.formBuilder.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: [''],
    message: ['', Validators.required],
  });

  protected get firstName() {
    return this.contactForm.controls.firstName;
  }

  protected get email() {
    return this.contactForm.controls.email;
  }

  protected get message() {
    return this.contactForm.controls.message;
  }

  protected submitMessage(): void {
    this.contactForm.markAllAsTouched();
    this.showIntegrationNotice.set(this.contactForm.valid);
  }
}
