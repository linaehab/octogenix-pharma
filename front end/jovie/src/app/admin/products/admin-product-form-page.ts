import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { AdminAuthService } from '../admin-auth.service';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { AdminState } from '../components/admin-state';
import { AdminProduct, ProductPayload, defaultVariant } from './admin-products.models';
import { AdminProductsService, IMAGE_MAX_BYTES, IMAGE_TYPES } from './admin-products.service';
import { adminProductsTranslations } from './admin-products-translations';
import { apiErrorMessages, apiFieldErrors } from './api-errors';
import { egpToPiastres, piastresToEgp } from './money';

/** An image in the form: one already on the product (id) or a new file waiting to be uploaded. */
export interface FormImage {
  key: string;
  id?: number;
  file?: File;
  url: string;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** EGP amount typed by the admin: up to 8 digits and 2 decimals, at least 0.01 (piastres >= 1). */
function egpAmount(control: AbstractControl): ValidationErrors | null {
  const piastres = egpToPiastres(control.value);
  if (piastres === null) {
    return null;
  }
  return Number.isNaN(piastres) ? { egp: true } : piastres < 1 ? { egpMin: true } : null;
}

/** The original (compare-at) price must be above the price, and needs a price. */
function compareAtAbovePrice(group: AbstractControl): ValidationErrors | null {
  const price = egpToPiastres(group.get('price')?.value);
  const compareAt = egpToPiastres(group.get('compare_at')?.value);
  if (compareAt === null || Number.isNaN(compareAt)) {
    return null;
  }
  if (price === null || Number.isNaN(price)) {
    return { compareAtNeedsPrice: true };
  }
  return compareAt <= price ? { compareAtNotAbove: true } : null;
}

/**
 * Optional whole number within [min, max]. Defined here rather than with Validators.min/max: the
 * storefront does not use those, and using them would add them to the code every shopper downloads.
 */
function wholeNumber(min: number, max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();
    if (text === '') {
      return null;
    }
    const value = /^\d{1,9}$/.test(text) ? Number(text) : Number.NaN;
    return Number.isNaN(value) || value < min || value > max ? { wholeNumber: { min, max } } : null;
  };
}

function ageRange(group: AbstractControl): ValidationErrors | null {
  const from = group.get('age_from')?.value;
  const to = group.get('age_to')?.value;
  return from !== null && to !== null && from !== '' && to !== '' && Number(to) < Number(from) ? { ageRange: true } : null;
}

/** API field -> form control (the size's fields are nested under "variant." in the API). */
const FIELD_MAP: Record<string, string> = {
  'variant.sku': 'sku',
  'variant.name_en': 'size_en',
  'variant.name_ar': 'size_ar',
  'variant.net_weight_grams': 'net_weight',
  'variant.price_piastres': 'price',
  'variant.compare_at_price_piastres': 'compare_at',
  'variant.initial_stock': 'initial_stock',
  age_from_months: 'age_from',
  age_to_months: 'age_to',
};

/**
 * /admin/products/new and /admin/products/:id — the product, its single size (SKU, price; stock is
 * read-only here) and its images. Saving runs in a safe order: product and size together (the API
 * does it in one transaction), then images, then visibility, so an unfinished product is never shown.
 */
@Component({
  selector: 'app-admin-product-form-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, AdminState, AdminConfirmDialog],
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
  templateUrl: './admin-product-form-page.html',
  styleUrls: ['./admin-product-form-page.css', './admin-product-images.css'],
})
export class AdminProductFormPage {
  private readonly api = inject(AdminProductsService);
  protected readonly language = inject(LanguageService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  protected readonly imageTypes = IMAGE_TYPES.join(',');
  protected readonly productId = signal<number | null>(null);
  protected readonly product = signal<AdminProduct | null>(null);
  protected readonly loadState = signal<'loading' | 'ready' | 'error' | 'notFound'>('ready');
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly notice = signal<{ kind: 'success' | 'error'; text: string; details?: string[] } | null>(null);
  protected readonly images = signal<FormImage[]>([]);
  protected readonly primaryKey = signal<string | null>(null);
  protected readonly removedIds = signal<number[]>([]);
  protected readonly fileErrors = signal<string[]>([]);
  private slugTouched = false;
  private snapshot = '';
  private leaving = false;

  /** Opening stock is a stock change: only for admins who may manage inventory. */
  protected readonly canSetStock = computed(() => this.auth.can({ permissions: ['inventory.manage'] }));
  protected readonly isNew = computed(() => this.productId() === null);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      name_en: ['', [Validators.required, Validators.maxLength(200)]],
      name_ar: ['', [Validators.required, Validators.maxLength(200)]],
      slug: ['', [Validators.required, Validators.maxLength(160), Validators.pattern(SLUG)]],
      subtitle_en: ['', Validators.maxLength(255)],
      subtitle_ar: ['', Validators.maxLength(255)],
      short_description_en: ['', Validators.maxLength(500)],
      short_description_ar: ['', Validators.maxLength(500)],
      description_en: ['', Validators.maxLength(5000)],
      description_ar: ['', Validators.maxLength(5000)],
      stage: ['', wholeNumber(1, 9)],
      age_from: ['', wholeNumber(0, 255)],
      age_to: ['', wholeNumber(0, 255)],
      sku: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(64), Validators.pattern(SKU)]],
      size_en: ['', [Validators.required, Validators.maxLength(100)]],
      size_ar: ['', [Validators.required, Validators.maxLength(100)]],
      net_weight: ['', wholeNumber(1, 100000)],
      price: ['', egpAmount],
      compare_at: ['', egpAmount],
      initial_stock: ['', wholeNumber(0, 1000000)],
      is_active: [false],
      is_purchasable: [false],
      is_featured: [false],
    },
    { validators: [compareAtAbovePrice, ageRange] },
  );

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly dirty = computed(() => this.signature(this.formValue(), this.images(), this.primaryKey(), this.removedIds()) !== this.snapshotSignal());
  private readonly snapshotSignal = signal('');

  protected readonly pricePreview = computed(() => this.preview(this.formValue().price ?? ''));
  protected readonly comparePreview = computed(() => this.preview(this.formValue().compare_at ?? ''));
  protected readonly stock = computed(() => {
    const product = this.product();
    return product ? (defaultVariant(product)?.stock_quantity ?? 0) : null;
  });

  constructor() {
    this.language.addTranslations(adminProductsTranslations);
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => this.images().forEach((image) => image.file && URL.revokeObjectURL(image.url)));

    // New product: the web address follows the English name until it is edited by hand.
    const nameChanges = this.form.controls.name_en.valueChanges.subscribe((name) => {
      if (this.isNew() && !this.slugTouched) {
        this.form.controls.slug.setValue(
          name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160),
        );
      }
    });
    destroyRef.onDestroy(() => nameChanges.unsubscribe());

    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      this.productId.set(Number(id));
      this.load();
    } else {
      this.takeSnapshot();
    }
    const created = (this.router.getCurrentNavigation()?.extras.state ?? history.state)?.['created'];
    if (created) {
      this.notice.set({ kind: 'success', text: this.language.translate('admin.products.createdNotice') });
    }
  }

  protected load(): void {
    const id = this.productId();
    if (id === null) {
      return;
    }
    this.loadState.set('loading');
    this.api.get(id).subscribe({
      next: (product) => {
        this.fill(product);
        this.loadState.set('ready');
      },
      error: (error: unknown) => {
        if (this.sessionEnded(error)) {
          return;
        }
        this.loadState.set(error instanceof HttpErrorResponse && error.status === 404 ? 'notFound' : 'error');
      },
    });
  }

  protected slugEdited(): void {
    this.slugTouched = true;
  }

  // ---- Images -------------------------------------------------------------------------------

  protected addFiles(input: HTMLInputElement): void {
    const errors: string[] = [];
    const added: FormImage[] = [];
    for (const file of Array.from(input.files ?? [])) {
      if (!IMAGE_TYPES.includes(file.type)) {
        errors.push(this.language.translate('admin.products.fileType', { name: file.name }));
      } else if (file.size > IMAGE_MAX_BYTES) {
        errors.push(this.language.translate('admin.products.fileSize', { name: file.name }));
      } else {
        added.push({ key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file) });
      }
    }
    input.value = '';
    this.fileErrors.set(errors);
    if (added.length) {
      this.images.update((list) => [...list, ...added]);
      if (this.primaryKey() === null) {
        this.primaryKey.set(this.images()[0].key);
      }
    }
  }

  protected makePrimary(image: FormImage): void {
    this.primaryKey.set(image.key);
  }

  protected move(index: number, step: -1 | 1): void {
    this.images.update((list) => {
      const target = index + step;
      if (target < 0 || target >= list.length) {
        return list;
      }
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  protected async remove(image: FormImage): Promise<void> {
    const ok = await this.confirm().ask({
      title: 'admin.products.removeImageTitle',
      message: image.id ? 'admin.products.removeImageText' : 'admin.products.removeNewImageText',
      confirm: 'admin.products.removeImage',
      tone: 'danger',
    });
    if (!ok) {
      return;
    }
    if (image.id) {
      this.removedIds.update((ids) => [...ids, image.id!]);
    } else if (image.file) {
      URL.revokeObjectURL(image.url);
    }
    this.images.update((list) => list.filter((i) => i.key !== image.key));
    if (this.primaryKey() === image.key) {
      this.primaryKey.set(this.images()[0]?.key ?? null);
    }
  }

  // ---- Saving -------------------------------------------------------------------------------

  protected async save(): Promise<void> {
    this.submitted.set(true);
    this.notice.set(null);
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notice.set({ kind: 'error', text: this.language.translate('admin.products.fixErrors') });
      queueMicrotask(() => (document.querySelector('[aria-invalid="true"]') as HTMLElement | null)?.focus());
      return;
    }
    if (this.form.getRawValue().is_active && this.images().length === 0) {
      this.notice.set({ kind: 'error', text: this.language.translate('admin.products.activeNeedsImage') });
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    const existing = this.product();
    // Shown only after the images are in place (the API refuses an active product without one).
    const showAfterImages = value.is_active && !(existing?.is_active ?? false);
    let product: AdminProduct;

    try {
      const payload = this.payload(showAfterImages);
      product = existing ? await firstValueFrom(this.api.update(existing.id, payload)) : await firstValueFrom(this.api.create(payload));
    } catch (error) {
      this.saving.set(false);
      this.showError(error, true);
      return;
    }

    try {
      await this.saveImages(product);
      if (showAfterImages) {
        await firstValueFrom(this.api.update(product.id, { is_active: true }));
      }
    } catch (error) {
      // The product itself is saved; reload it so the form shows what the server has.
      this.saving.set(false);
      this.showError(error, false);
      await this.afterSave(product.id, existing === null, false);
      return;
    }

    this.saving.set(false);
    await this.afterSave(product.id, existing === null, true);
  }

  private async saveImages(product: AdminProduct): Promise<void> {
    const ids = new Map<string, number>();
    for (const image of this.images()) {
      if (image.id) {
        ids.set(image.key, image.id);
      } else if (image.file) {
        const path = await firstValueFrom(this.api.uploadImage(image.file));
        const attached = await firstValueFrom(this.api.attachImage(product.id, path));
        ids.set(image.key, attached.id);
      }
    }
    // New images are attached before old ones are removed, so an active product always keeps one.
    for (const id of this.removedIds()) {
      await firstValueFrom(this.api.removeImage(id));
    }
    const primary = this.primaryKey() ? ids.get(this.primaryKey()!) : undefined;
    const current = await firstValueFrom(this.api.get(product.id));
    if (primary !== undefined && !current.images.find((i) => i.id === primary)?.is_primary) {
      await firstValueFrom(this.api.makePrimary(primary));
    }
    const order = this.images().map((image) => ids.get(image.key)!).filter((id) => id !== undefined);
    const serverOrder = [...current.images].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.id);
    if (order.length > 1 && order.join() !== serverOrder.join()) {
      await firstValueFrom(this.api.reorderImages(product.id, order));
    }
  }

  private async afterSave(id: number, created: boolean, ok: boolean): Promise<void> {
    if (created) {
      this.leaving = true;
      await this.router.navigate(['/admin/products', id], { replaceUrl: true, state: ok ? { created: true } : {} });
      return;
    }
    try {
      this.fill(await firstValueFrom(this.api.get(id)));
      if (ok) {
        this.notice.set({ kind: 'success', text: this.language.translate('admin.products.savedNotice') });
      }
    } catch {
      this.loadState.set('error');
    }
  }

  private payload(showAfterImages: boolean): ProductPayload {
    const v = this.form.getRawValue();
    const text = (value: string) => (value.trim() === '' ? null : value.trim());
    const int = (value: string) => (value === '' ? null : Number(value));
    const payload: ProductPayload = {
      slug: v.slug,
      name_en: v.name_en.trim(),
      name_ar: v.name_ar.trim(),
      subtitle_en: text(v.subtitle_en),
      subtitle_ar: text(v.subtitle_ar),
      short_description_en: text(v.short_description_en),
      short_description_ar: text(v.short_description_ar),
      description_en: text(v.description_en),
      description_ar: text(v.description_ar),
      stage: int(v.stage),
      age_from_months: int(v.age_from),
      age_to_months: int(v.age_to),
      is_purchasable: v.is_purchasable,
      is_featured: v.is_featured,
      variant: {
        sku: v.sku.trim().toUpperCase(),
        name_en: v.size_en.trim(),
        name_ar: v.size_ar.trim(),
        net_weight_grams: int(v.net_weight),
        price_piastres: egpToPiastres(v.price),
        compare_at_price_piastres: egpToPiastres(v.compare_at),
      },
    };
    // Hiding happens at once; showing waits until the images are saved.
    if (!showAfterImages) {
      payload.is_active = v.is_active;
    }
    if (this.isNew() && this.canSetStock() && v.initial_stock !== '') {
      payload.variant!.initial_stock = Number(v.initial_stock);
    }
    return payload;
  }

  private fill(product: AdminProduct): void {
    this.product.set(product);
    const v = defaultVariant(product);
    const str = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
    this.form.reset({
      name_en: product.name_en,
      name_ar: product.name_ar,
      slug: product.slug,
      subtitle_en: product.subtitle_en ?? '',
      subtitle_ar: product.subtitle_ar ?? '',
      short_description_en: product.short_description_en ?? '',
      short_description_ar: product.short_description_ar ?? '',
      description_en: product.description_en ?? '',
      description_ar: product.description_ar ?? '',
      stage: str(product.stage),
      age_from: str(product.age_from_months),
      age_to: str(product.age_to_months),
      sku: v?.sku ?? '',
      size_en: v?.name_en ?? '',
      size_ar: v?.name_ar ?? '',
      net_weight: str(v?.net_weight_grams),
      price: piastresToEgp(v?.price_piastres),
      compare_at: piastresToEgp(v?.compare_at_price_piastres),
      initial_stock: '',
      is_active: product.is_active,
      is_purchasable: product.is_purchasable,
      is_featured: product.is_featured,
    });
    this.images().forEach((image) => image.file && URL.revokeObjectURL(image.url));
    const ordered = [...product.images].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    this.images.set(ordered.map((image) => ({ key: `img-${image.id}`, id: image.id, url: image.url ?? '' })));
    this.primaryKey.set(ordered.find((i) => i.is_primary) ? `img-${ordered.find((i) => i.is_primary)!.id}` : (this.images()[0]?.key ?? null));
    this.removedIds.set([]);
    this.submitted.set(false);
    this.takeSnapshot();
  }

  private showError(error: unknown, mapFields: boolean): void {
    if (this.sessionEnded(error)) {
      return;
    }
    const fields = apiFieldErrors(error);
    const general: string[] = [];
    for (const [key, messages] of Object.entries(fields)) {
      const control = mapFields ? this.form.get(FIELD_MAP[key] ?? key) : null;
      if (control) {
        control.setErrors({ ...(control.errors ?? {}), server: messages[0] });
        control.markAsTouched();
      } else {
        general.push(...messages);
      }
    }
    const details = Object.keys(fields).length ? general : apiErrorMessages(error);
    this.notice.set({
      kind: 'error',
      text: this.language.translate(mapFields ? 'admin.products.saveFailed' : 'admin.products.partlySaved'),
      details: [...new Set(details)],
    });
  }

  // ---- Leaving with unsaved changes ---------------------------------------------------------

  /** Called by the route's canDeactivate guard. */
  canLeave(): boolean | Promise<boolean> {
    if (this.leaving || this.saving() || !this.dirty()) {
      return true;
    }
    return this.confirm().ask({
      title: 'admin.products.leaveTitle',
      message: 'admin.products.leaveText',
      confirm: 'admin.products.leave',
      tone: 'danger',
    });
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty() && !this.saving()) {
      event.preventDefault();
    }
  }

  // ---- Helpers ------------------------------------------------------------------------------

  protected problem(name: string): string | null {
    const control = this.form.get(name);
    if (!control || !control.errors || !(control.touched || this.submitted())) {
      return null;
    }
    const e = control.errors;
    if (e['server']) return e['server'];
    if (e['required']) return this.language.translate('admin.products.errRequired');
    if (e['maxlength']) return this.language.translate('admin.products.errMax', { max: e['maxlength'].requiredLength });
    if (e['minlength']) return this.language.translate('admin.products.errMin', { min: e['minlength'].requiredLength });
    if (e['egp']) return this.language.translate('admin.products.errEgp');
    if (e['egpMin']) return this.language.translate('admin.products.errEgpMin');
    if (e['pattern'] && name === 'slug') return this.language.translate('admin.products.errSlug');
    if (e['pattern'] && name === 'sku') return this.language.translate('admin.products.errSku');
    if (e['wholeNumber']) return this.language.translate('admin.products.errNumber');
    return this.language.translate('admin.products.errInvalid');
  }

  protected compareProblem(): string | null {
    const e = this.form.errors;
    if (!e || !(this.form.get('compare_at')?.touched || this.submitted())) {
      return null;
    }
    if (e['compareAtNeedsPrice']) return this.language.translate('admin.products.errCompareNeedsPrice');
    if (e['compareAtNotAbove']) return this.language.translate('admin.products.errCompareAbove');
    return null;
  }

  protected ageProblem(): string | null {
    return this.form.errors?.['ageRange'] && (this.form.get('age_to')?.touched || this.submitted())
      ? this.language.translate('admin.products.errAgeRange')
      : null;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value);
  }

  private preview(text: string): string | null {
    const piastres = egpToPiastres(text);
    return piastres === null || Number.isNaN(piastres) ? null : formatPrice({ amount_piastres: piastres, currency: 'EGP' }, this.language.currentLanguage());
  }

  private takeSnapshot(): void {
    this.snapshotSignal.set(this.signature(this.form.getRawValue(), this.images(), this.primaryKey(), this.removedIds()));
  }

  private signature(value: unknown, images: FormImage[], primary: string | null, removed: number[]): string {
    return JSON.stringify([value, images.map((i) => i.key), primary, removed]);
  }

  private sessionEnded(error: unknown): boolean {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      this.auth.sessionEnded();
      this.leaving = true;
      void this.router.navigateByUrl('/admin/login');
      return true;
    }
    return false;
  }
}
