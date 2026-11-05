import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ReviewForm as ReviewFormValue, ReviewsService } from '../../store/reviews.service';
import { emailAddress } from '../../../core/forms/email-address.validator';

/**
 * "Write a review" dialog: name, optional email (never published), 1–5 stars, title, comment,
 * recommendation, and an optional order number + email for the "verified purchase" badge.
 * Reviews are published only after the team approves them; the success message says so.
 */
@Component({
  selector: 'app-review-form',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './review-form.html',
  styleUrl: './review-form.css',
})
export class ReviewForm {
  private readonly reviews = inject(ReviewsService);
  private readonly language = inject(LanguageService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly injector = inject(Injector);

  readonly slug = input.required<string>();
  readonly productName = input('');

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [emailAddress, Validators.maxLength(255)]],
    rating: this.fb.control<number | null>(null, Validators.required),
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    body: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    recommends: this.fb.control<boolean | null>(null),
    order_number: ['', Validators.maxLength(20)],
    order_email: ['', [emailAddress, Validators.maxLength(255)]],
    website: [''],
  });

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hover = signal(0);
  protected readonly state = signal<'form' | 'sending' | 'sent'>('form');
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);

  open(): void {
    this.form.reset();
    this.state.set('form');
    this.error.set(null);
    this.submitted.set(false);
    this.dialog().nativeElement.showModal();
  }

  protected close(): void {
    this.dialog().nativeElement.close();
  }

  /** A click on the backdrop (the dialog element itself) closes it. Returns nothing on purpose:
      a template listener returning false would cancel every click inside the form. */
  protected backdrop(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }

  /** Translation key of a field's first problem, once the customer tried to send. */
  protected problem(name: keyof ReviewFormValue): string | null {
    const control = this.form.controls[name];
    if (control.valid || !(control.touched || this.submitted())) {
      return null;
    }
    const errors = control.errors ?? {};
    if (errors['server']) return 'jovie.form.checkField';
    if (errors['required']) return name === 'rating' ? 'jovie.reviews.chooseRating' : 'jovie.form.required';
    if (errors['email']) return 'jovie.form.email';
    if (errors['minlength']) return 'jovie.reviews.tooShort';
    if (errors['maxlength']) return 'jovie.form.tooLong';
    if (errors['order']) return 'jovie.reviews.orderNotFound';
    return 'jovie.form.checkField';
  }

  protected send(): void {
    this.submitted.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    if (value.order_number.trim() && !value.order_email.trim()) {
      this.form.controls.order_email.setErrors({ required: true });
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstProblem();
      return;
    }
    this.state.set('sending');
    this.reviews.submit(this.slug(), value, this.language.currentLanguage()).subscribe({
      next: () => this.state.set('sent'),
      error: (error: unknown) => {
        this.state.set('form');
        if (error instanceof HttpErrorResponse && error.status === 422) {
          const errors: Record<string, string[]> = error.error?.errors ?? {};
          for (const key of Object.keys(errors)) {
            const control = this.form.get(key);
            control?.setErrors({ [key === 'order_number' ? 'order' : 'server']: errors[key][0] });
            control?.markAsTouched();
          }
          this.error.set('jovie.checkout.checkFields');
          this.focusFirstProblem();
        } else if (error instanceof HttpErrorResponse && error.status === 429) {
          this.error.set('jovie.reviews.tooMany');
        } else {
          this.error.set('jovie.reviews.sendError');
        }
      },
    });
  }

  /** After the errors are rendered, moves focus to the first field that needs attention. */
  private focusFirstProblem(): void {
    afterNextRender(
      () => {
        const first = this.dialog().nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]');
        (first?.querySelector<HTMLElement>('input') ?? first)?.focus();
      },
      { injector: this.injector },
    );
  }
}
