import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LocalizedText } from '../../../core/content/site-content.models';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AccountApiService } from '../../account/account-api.service';
import { AddressInput, CustomerAddress } from '../../account/account.models';
import { CustomerAuthService } from '../../account/customer-auth.service';
import { formatPrice } from '../../data/format-price';
import { Money } from '../../data/jovie-product.models';
import { CartService } from '../../store/cart.service';
import { CheckoutService, TotalsChangedError } from '../../store/checkout.service';
import { Governorate, GuestCheckoutForm, Order, PaymentMethod } from '../../store/store.models';
import { StorePageHeader } from '../../store/store-page-header';
import { TestModeNotice } from '../../store/test-mode-notice';
import { emailAddress } from '../../../core/forms/email-address.validator';

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
 * /jovie/checkout on POST /api/v1/checkout, for guests and signed-in customers.
 *
 * Guest: the form sends what to buy (the cart's variant IDs and quantities), the contact details,
 * where to deliver and how to pay. Signed in: the server takes the items from the account cart and
 * the contact details from the account; the customer picks a saved address (or adds one, saved to
 * My Addresses first) and the payment. Either way the totals shown are an estimate from the
 * server's published fees, and the server's own calculation decides (a change comes back as 409
 * with the new totals for the customer to confirm).
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
  protected readonly auth = inject(CustomerAuthService);
  private readonly account = inject(AccountApiService);
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
      email: ['', [Validators.required, emailAddress, Validators.maxLength(255)]],
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

  /** Signed in (decided when the page opens; the route waits for the session check). */
  protected readonly isCustomer = signal(false);
  protected readonly savedAddresses = signal<CustomerAddress[] | null>(null);
  protected readonly addressesError = signal(false);
  /** The saved address to deliver to, or 'new' to type one (saved to the account before ordering). */
  protected readonly addressChoice = signal<number | 'new'>('new');

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly deliverable = computed(() => (this.governorates() ?? []).filter((g) => g.is_deliverable));
  protected readonly governorate = computed(() => {
    const choice = this.addressChoice();
    const id =
      this.isCustomer() && choice !== 'new'
        ? this.savedAddresses()?.find((a) => a.id === choice)?.governorate_id
        : Number(this.value().address?.governorate_id);
    return this.deliverable().find((g) => g.id === id) ?? null;
  });
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

    if (this.auth.isSignedIn()) {
      // The account holds the contact details: only the delivery address and payment are asked for.
      this.isCustomer.set(true);
      this.form.controls.contact.disable();
      this.loadAddresses();
    }

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

  protected loadAddresses(): void {
    this.addressesError.set(false);
    this.account.addresses().subscribe({
      next: (list) => {
        this.savedAddresses.set(list);
        const preferred = list.find((a) => a.is_default) ?? list[0];
        this.chooseAddress(preferred ? preferred.id : 'new');
      },
      error: () => {
        this.addressesError.set(true);
        this.chooseAddress('new');
      },
    });
  }

  /** A saved address needs no typing: the address fields are only checked for a new one. */
  protected chooseAddress(choice: number | 'new'): void {
    this.addressChoice.set(choice);
    const address = this.form.controls.address;
    if (choice === 'new') {
      address.enable();
      const customer = this.auth.customer();
      if (customer && !address.controls.recipient_name.value) {
        address.patchValue({
          recipient_name: `${customer.first_name} ${customer.last_name}`.trim(),
          phone: customer.phone ? `0${customer.phone.slice(3)}` : '',
        });
      }
    } else {
      address.disable();
    }
    const chosen = this.form.controls.payment_method.value;
    if (chosen && !this.methods().includes(chosen)) {
      this.form.controls.payment_method.setValue(null);
    }
    this.serverTotals.set(null);
  }

  protected addressLine(a: CustomerAddress): string {
    const separator = this.language.currentLanguage() === 'ar' ? '، ' : ', ';
    return [a.street, a.building, a.area, a.city, this.pick(a.governorate.name)].filter(Boolean).join(separator);
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

    const order$: Observable<Order> = this.isCustomer()
      ? this.customerAddressId().pipe(
          switchMap((addressId) =>
            this.checkout.placeCustomerOrder(
              addressId,
              this.form.controls.payment_method.value!,
              this.form.controls.customer_note.value,
              this.idempotencyKey(),
              expected,
              this.language.currentLanguage(),
            ),
          ),
        )
      : this.checkout.placeGuestOrder(
          this.form.getRawValue() as GuestCheckoutForm,
          this.cart.lines(),
          this.idempotencyKey(),
          expected,
          this.language.currentLanguage(),
        );

    order$.subscribe({
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

  /** The chosen saved address, or the new one saved to the account first (it then stays chosen). */
  private customerAddressId(): Observable<number> {
    const choice = this.addressChoice();
    if (choice !== 'new') {
      return of(choice);
    }
    const a = this.form.controls.address.getRawValue();
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());
    const input: AddressInput = {
      label: null,
      recipient_name: a.recipient_name.trim(),
      phone: a.phone.trim(),
      governorate_id: a.governorate_id!,
      city: a.city.trim(),
      area: optional(a.area),
      street: a.street.trim(),
      building: optional(a.building),
      floor: optional(a.floor),
      apartment: optional(a.apartment),
      landmark: optional(a.landmark),
      postal_code: optional(a.postal_code),
    };
    return this.account.addAddress(input).pipe(
      map((saved) => {
        this.savedAddresses.update((list) => [...(list ?? []), saved]);
        this.chooseAddress(saved.id);
        return saved.id;
      }),
    );
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
        const addressFields = ['recipient_name', 'phone', 'governorate_id', 'city', 'area', 'street', 'building', 'floor', 'apartment', 'landmark', 'postal_code'];
        const path = this.isCustomer() && this.addressChoice() === 'new' && addressFields.includes(key) ? `address.${key}` : key === 'governorate_id' ? 'address.governorate_id' : key;
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
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.error.set({ key: 'account.checkout.sessionEnded' });
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
