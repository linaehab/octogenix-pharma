import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LocalizedText } from '../../../core/content/site-content.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { formatPrice } from '../../data/format-price';
import { Money } from '../../data/jovie-product.models';
import { CartService } from '../../store/cart.service';
import { CheckoutService, TotalsChangedError } from '../../store/checkout.service';
import { Governorate, GuestCheckoutForm, PaymentMethod } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';
import { TestModeNotice } from '../../store/test-mode-notice';

const KEY_STORAGE = 'jovie.checkout.key';

/** The server's Egyptian mobile rule (PhoneNumber::normalize + isEgyptianMobile). */
export function egyptianMobile(control: AbstractControl<string>): ValidationErrors | null {
  const raw = (control.value ?? '').replace(/[\s\-.()]/g, '');
  if (raw === '') {
    return null;
  }
  const number = raw.startsWith('00') ? `+${raw.slice(2)}` : /^0\d{8,10}$/.test(raw) ? `+20${raw.slice(1)}` : raw;
  return /^\+201[0125]\d{8}$/.test(number) ? null : { phone: true };
}

const piastres = (money: Money | null | undefined) => money?.amount_piastres ?? 0;

/**
 * /jovie/checkout: guest checkout on POST /api/v1/checkout. The form sends what to buy (the
 * cart's variant IDs and quantities), where to deliver and how to pay; the totals shown are an
 * estimate from the server's published fees, and the server's own calculation decides (a change
 * comes back as 409 with the new totals for the customer to confirm).
 */
@Component({
  selector: 'app-jovie-checkout-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, StorePageHeader, TestModeNotice],
  templateUrl: './jovie-checkout-page.html',
  styleUrl: './jovie-checkout-page.css',
})
export class JovieCheckoutPage {
  protected readonly cart = inject(CartService);
  protected readonly checkout = inject(CheckoutService);
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  protected readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly text = (max: number, required = true) =>
    required ? [Validators.required, Validators.maxLength(max)] : [Validators.maxLength(max)];

  protected readonly form = this.fb.group({
    contact: this.fb.group({
      first_name: ['', this.text(80)],
      last_name: ['', this.text(80)],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.required, egyptianMobile]],
    }),
    address: this.fb.group({
      recipient_name: ['', this.text(160)],
      phone: ['', [Validators.required, egyptianMobile]],
      governorate_id: this.fb.control<number | null>(null, Validators.required),
      city: ['', this.text(100)],
      area: ['', this.text(100, false)],
      street: ['', this.text(255)],
      building: ['', this.text(50, false)],
      floor: ['', this.text(20, false)],
      apartment: ['', this.text(20, false)],
      landmark: ['', this.text(255, false)],
      postal_code: ['', Validators.pattern(/^\d{5}$/)],
    }),
    payment_method: this.fb.control<PaymentMethod | null>(null, Validators.required),
    customer_note: ['', Validators.maxLength(1000)],
  });

  protected readonly governorates = signal<Governorate[] | null>(null);
  protected readonly governorateError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<{ key: string; params?: Record<string, string> } | null>(null);
  /** Totals the server reported after a 409; the next submit confirms exactly these. */
  protected readonly serverTotals = signal<TotalsChangedError['totals'] | null>(null);
  protected readonly submitted = signal(false);

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly deliverable = computed(() => (this.governorates() ?? []).filter((g) => g.is_deliverable));
  protected readonly governorate = computed(
    () => this.deliverable().find((g) => g.id === Number(this.value().address?.governorate_id)) ?? null,
  );
  protected readonly methods = computed(() => this.checkout.methodsFor(this.governorate()));
  protected readonly method = computed(() => this.value().payment_method ?? null);

  protected readonly subtotal = computed(() => this.cart.summary()?.subtotal ?? null);
  protected readonly shippingFee = computed<Money | null>(() => {
    const governorate = this.governorate();
    if (!governorate?.shipping_fee) {
      return null;
    }
    const threshold = this.checkout.config().freeShippingFrom;
    return threshold && piastres(this.subtotal()) >= threshold.amount_piastres
      ? { ...governorate.shipping_fee, amount_piastres: 0 }
      : governorate.shipping_fee;
  });
  protected readonly codFee = computed(() => (this.method() === 'cod' ? this.checkout.config().codFee : null));
  protected readonly total = computed<Money | null>(() => {
    const subtotal = this.subtotal();
    const shipping = this.shippingFee();
    if (!subtotal || !shipping || !this.method()) {
      return null;
    }
    return { ...subtotal, amount_piastres: subtotal.amount_piastres + shipping.amount_piastres + piastres(this.codFee()) };
  });

  /** Why the order cannot be placed now (store, cart or configuration), or null. */
  protected readonly blocked = computed(() => {
    const summary = this.cart.summary();
    if (!this.checkout.config().enabled) {
      return 'jovie.cart.storeClosed';
    }
    if (this.cart.isEmpty()) {
      return 'jovie.cart.empty';
    }
    if (summary && (summary.has_unavailable_items || summary.items.some((line) => !line.unit_price))) {
      return 'jovie.cart.fixUnavailable';
    }
    if (this.governorates() && !this.deliverable().length) {
      return 'jovie.checkout.noDelivery';
    }
    if (!this.checkout.methodsFor(null).length) {
      return 'jovie.checkout.noPayment';
    }
    return null;
  });

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.cart.refresh().subscribe({ error: () => undefined });
    this.loadGovernorates();

    // The recipient is the customer unless changed: copy name and phone while untouched.
    const contact = this.form.controls.contact;
    const address = this.form.controls.address;
    contact.valueChanges.pipe(takeUntilDestroyed()).subscribe((c) => {
      if (!address.controls.recipient_name.dirty) {
        address.controls.recipient_name.setValue(`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(), { emitEvent: false });
      }
      if (!address.controls.phone.dirty) {
        address.controls.phone.setValue(c.phone ?? '', { emitEvent: false });
      }
    });
    // A method the chosen governorate does not offer is cleared.
    address.controls.governorate_id.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const chosen = this.form.controls.payment_method.value;
      if (chosen && !this.methods().includes(chosen)) {
        this.form.controls.payment_method.setValue(null);
      }
      this.serverTotals.set(null);
    });
  }

  protected loadGovernorates(): void {
    this.governorateError.set(false);
    this.checkout.governorates().subscribe({
      next: (list) => this.governorates.set(list),
      error: () => this.governorateError.set(true),
    });
  }

  protected pick(text: LocalizedText | null | undefined): string {
    return this.content.pick(text);
  }

  protected price(money: Money | null | undefined): string {
    return money ? formatPrice(money, this.language.currentLanguage()) : '—';
  }

  /** Translation key of a control's first problem, once the customer has tried to continue. */
  protected problem(path: string): string | null {
    const control = this.form.get(path);
    if (!control || control.valid || !(control.touched || this.submitted())) {
      return null;
    }
    const errors = control.errors ?? {};
    if (errors['server']) return 'jovie.form.checkField';
    if (errors['required']) return 'jovie.form.required';
    if (errors['email']) return 'jovie.form.email';
    if (errors['phone']) return 'jovie.form.phone';
    if (errors['pattern']) return 'jovie.form.postalCode';
    if (errors['maxlength']) return 'jovie.form.tooLong';
    return 'jovie.form.checkField';
  }

  protected submit(): void {
    this.submitted.set(true);
    this.error.set(null);
    if (this.blocked() || this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstProblem();
      return;
    }

    const confirmed = this.serverTotals();
    const expected = confirmed ? confirmed.total.amount_piastres : (this.total()?.amount_piastres ?? null);
    this.submitting.set(true);

    this.checkout
      .placeGuestOrder(this.form.getRawValue() as GuestCheckoutForm, this.cart.lines(), this.idempotencyKey(), expected, this.language.currentLanguage())
      .subscribe({
        next: (order) => {
          this.forgetIdempotencyKey();
          this.cart.clear();
          if (order.payment_method === 'card') {
            this.startPayment(order.order_number);
          } else {
            this.router.navigate(['/jovie/checkout/confirmation', order.order_number]);
          }
        },
        error: (error: unknown) => this.failed(error),
      });
  }

  private startPayment(orderNumber: string): void {
    this.checkout.startCardPayment(orderNumber).subscribe({
      next: ({ redirect_url }) => this.go(redirect_url),
      error: () => this.router.navigate(['/jovie/checkout/payment-result'], { queryParams: { order: orderNumber } }),
    });
  }

  /** The provider's payment page; in TEST MODE the store's own mock page (opened in the app). */
  private go(url: string): void {
    const target = new URL(url, window.location.origin);
    if (target.pathname === '/jovie/checkout/mock-payment') {
      this.router.navigateByUrl(target.pathname + target.search);
    } else {
      window.location.assign(target.href);
    }
  }

  private failed(error: unknown): void {
    this.submitting.set(false);

    if (error instanceof TotalsChangedError) {
      this.serverTotals.set(error.totals);
      this.error.set({ key: 'jovie.checkout.totalsChanged', params: { total: this.price(error.totals.total) } });
      this.cart.refresh().subscribe({ error: () => undefined });
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 422) {
      const errors: Record<string, string[]> = error.error?.errors ?? {};
      let fieldProblem = false;
      for (const key of Object.keys(errors)) {
        const path = key === 'governorate_id' ? 'address.governorate_id' : key;
        const control = this.form.get(path);
        if (control) {
          control.setErrors({ ...(control.errors ?? {}), server: errors[key][0] });
          control.markAsTouched();
          fieldProblem = true;
        }
      }
      const itemProblem = Object.keys(errors).some((key) => key.startsWith('items'));
      if (itemProblem) {
        this.cart.refresh().subscribe({ error: () => undefined });
      }
      this.error.set({ key: itemProblem ? 'jovie.checkout.itemsChanged' : fieldProblem ? 'jovie.checkout.checkFields' : 'jovie.checkout.failed' });
      this.focusFirstProblem();
      return;
    }
    if (error instanceof HttpErrorResponse && error.status === 503) {
      this.error.set({ key: 'jovie.cart.storeClosed' });
      return;
    }
    this.error.set({ key: 'jovie.checkout.failed' });
  }

  /** One key per checkout attempt, kept across retries so a repeated submit cannot order twice. */
  private idempotencyKey(): string {
    let key: string | null = null;
    try {
      key = sessionStorage.getItem(KEY_STORAGE);
    } catch {
      // ignore
    }
    if (!key) {
      key = crypto.randomUUID();
      try {
        sessionStorage.setItem(KEY_STORAGE, key);
      } catch {
        // ignore
      }
    }
    return key;
  }

  private forgetIdempotencyKey(): void {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      // ignore
    }
  }

  /** After the errors are rendered, moves focus to the first field that needs attention. */
  private focusFirstProblem(): void {
    afterNextRender(
      () => (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
  }
}
