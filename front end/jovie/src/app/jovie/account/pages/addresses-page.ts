import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, PLATFORM_ID, afterNextRender, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SiteContentService } from '../../../core/content/site-content.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { egyptianMobile } from '../../pages/jovie-checkout-page/jovie-checkout-page';
import { CheckoutService } from '../../store/checkout.service';
import { Governorate } from '../../store/store.models';
import { AccountApiService } from '../account-api.service';
import { AccountShell } from '../account-shell';
import { applyServerErrors, failureKey, problemOf } from '../account-forms';
import { AddressInput, CustomerAddress } from '../account.models';

type Field =
  | 'label' | 'recipient_name' | 'phone' | 'governorate_id' | 'city' | 'area' | 'street'
  | 'building' | 'floor' | 'apartment' | 'landmark' | 'postal_code';

/** The server keeps at most this many addresses per customer (CustomerAddress::MAX_PER_CUSTOMER). */
const MAX_ADDRESSES = 10;

/** /jovie/account/addresses — saved delivery addresses: add, edit, delete and choose the default. */
@Component({
  selector: 'app-addresses-page',
  imports: [ReactiveFormsModule, TranslatePipe, AccountShell],
  templateUrl: './addresses-page.html',
  styles: `
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
      gap: 1rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .address p {
      margin: 0 0 0.3rem;
    }

    .default {
      display: inline-block;
      margin-bottom: 0.6rem;
      padding: 0.2rem 0.7rem;
      border-radius: 999px;
      background: var(--jv-sunshine);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .address .actions {
      gap: 0.5rem 1rem;
    }

    .row3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 1rem;
    }

    @media (max-width: 560px) {
      .row3 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class AddressesPage {
  private readonly api = inject(AccountApiService);
  private readonly checkout = inject(CheckoutService);
  private readonly content = inject(SiteContentService);
  private readonly language = inject(LanguageService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly max = MAX_ADDRESSES;
  protected readonly addresses = signal<CustomerAddress[]>([]);
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly governorates = signal<Governorate[] | null>(null);
  protected readonly deliverable = computed(() => (this.governorates() ?? []).filter((g) => g.is_deliverable));

  /** null: the list; 'new': adding; a number: editing that address. */
  protected readonly editing = signal<'new' | number | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);
  protected readonly confirmDelete = signal<number | null>(null);
  protected readonly listError = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);

  private readonly text = (max: number, required = true) =>
    required ? [Validators.required, Validators.maxLength(max)] : [Validators.maxLength(max)];

  protected readonly form = this.fb.group({
    label: ['', this.text(50, false)],
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
    is_default: [false],
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    this.load();
    this.checkout.governorates().subscribe({ next: (list) => this.governorates.set(list), error: () => this.governorates.set([]) });
  }

  protected load(): void {
    this.state.set('loading');
    this.api.addresses().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.state.set('ready');
      },
      error: () => this.state.set('error'),
    });
  }

  protected pick = (text: Governorate['name'] | null | undefined) => this.content.pick(text);

  protected streetLine(a: CustomerAddress): string {
    const t = (key: string) => this.language.translate(key);
    return [
      a.street,
      a.building,
      a.floor ? `${t('jovie.checkout.floor')} ${a.floor}` : null,
      a.apartment ? `${t('jovie.checkout.apartment')} ${a.apartment}` : null,
    ]
      .filter(Boolean)
      .join(this.separator());
  }

  protected placeLine(a: CustomerAddress): string {
    return [a.area, a.city, this.pick(a.governorate.name)].filter(Boolean).join(this.separator());
  }

  private separator(): string {
    return this.language.currentLanguage() === 'ar' ? '، ' : ', ';
  }

  protected problem(name: Field): string | null {
    return problemOf(this.form.controls[name], this.submitted());
  }

  protected add(): void {
    this.form.reset({ governorate_id: null, is_default: this.addresses().length === 0 });
    this.open('new');
  }

  protected edit(address: CustomerAddress): void {
    this.form.reset({
      label: address.label ?? '',
      recipient_name: address.recipient_name,
      phone: address.phone.startsWith('+20') ? `0${address.phone.slice(3)}` : address.phone,
      governorate_id: address.governorate_id,
      city: address.city,
      area: address.area ?? '',
      street: address.street,
      building: address.building ?? '',
      floor: address.floor ?? '',
      apartment: address.apartment ?? '',
      landmark: address.landmark ?? '',
      postal_code: address.postal_code ?? '',
      is_default: address.is_default,
    });
    this.open(address.id);
  }

  protected close(): void {
    this.editing.set(null);
  }

  protected save(): void {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstProblem();
      return;
    }
    const v = this.form.getRawValue();
    const optional = (value: string) => (value.trim() === '' ? null : value.trim());
    const input: AddressInput = {
      label: optional(v.label),
      recipient_name: v.recipient_name.trim(),
      phone: v.phone.trim(),
      governorate_id: v.governorate_id!,
      city: v.city.trim(),
      area: optional(v.area),
      street: v.street.trim(),
      building: optional(v.building),
      floor: optional(v.floor),
      apartment: optional(v.apartment),
      landmark: optional(v.landmark),
      postal_code: optional(v.postal_code),
    };
    const editing = this.editing();
    // The default can be moved to another address, but not taken away from the current one.
    const current = typeof editing === 'number' ? this.addresses().find((a) => a.id === editing) : null;
    if (v.is_default || !current?.is_default) {
      input.is_default = v.is_default;
    }

    this.saving.set(true);
    const request = editing === 'new' ? this.api.addAddress(input) : this.api.updateAddress(editing as number, input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.message.set(editing === 'new' ? 'account.addresses.added' : 'account.addresses.saved');
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 422) {
          const matched = applyServerErrors(this.form, error, (field) =>
            field === 'phone' ? 'jovie.form.phone' : field === 'postal_code' ? 'jovie.form.postalCode' : 'jovie.form.checkField',
          );
          this.formError.set(
            matched ? 'jovie.checkout.checkFields' : error.error?.errors?.['address'] ? 'account.addresses.limit' : 'account.error.server',
          );
          this.focusFirstProblem();
          return;
        }
        this.formError.set(failureKey(error));
      },
    });
  }

  protected makeDefault(address: CustomerAddress): void {
    this.busyId.set(address.id);
    this.listError.set(null);
    this.message.set(null);
    this.api.updateAddress(address.id, { is_default: true }).subscribe({
      next: () => {
        this.busyId.set(null);
        this.message.set('account.addresses.defaultSet');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listError.set(failureKey(error));
      },
    });
  }

  protected remove(address: CustomerAddress): void {
    this.busyId.set(address.id);
    this.listError.set(null);
    this.message.set(null);
    this.api.deleteAddress(address.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.confirmDelete.set(null);
        this.message.set('account.addresses.deleted');
        this.load();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.listError.set(failureKey(error));
      },
    });
  }

  private open(target: 'new' | number): void {
    this.submitted.set(false);
    this.formError.set(null);
    this.message.set(null);
    this.editing.set(target);
    afterNextRender(() => (this.host.nativeElement as HTMLElement).querySelector<HTMLElement>('#ad-recipient')?.focus(), {
      injector: this.injector,
    });
  }

  private focusFirstProblem(): void {
    afterNextRender(
      () =>
        (this.host.nativeElement as HTMLElement)
          .querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"]')
          ?.focus(),
      { injector: this.injector },
    );
  }
}
