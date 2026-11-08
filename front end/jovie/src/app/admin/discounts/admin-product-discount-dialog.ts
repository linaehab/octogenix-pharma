import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { apiErrorMessages } from '../products/api-errors';
import { egpToPiastres, piastresToEgp } from '../products/money';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { DiscountType, ProductDiscountChange, ProductDiscountRow } from './admin-discounts.models';
import { AdminDiscountsService } from './admin-discounts.service';
import { cairoInput, inputValue, money, wholeNumber } from './discount-format';

interface Draft {
  type: DiscountType;
  value: string;
  active: boolean;
  starts: string;
  ends: string;
}

/**
 * Sets or edits the discount of one product. The preview of what customers will pay is computed
 * from the same rule as the API (percent rounded down to the piastre), but the API decides: it
 * validates again and saves only if the discount is still what the admin saw.
 */
@Component({
  selector: 'app-admin-product-discount-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="set-dialog" aria-labelledby="dsc-pd-title" (cancel)="close()">
      @if (row(); as r) {
        <form (submit)="$event.preventDefault(); save()" novalidate>
          <h2 id="dsc-pd-title">{{ 'admin.productDiscounts.dialogTitle' | translate }}</h2>
          <p class="set-dialog-name">{{ name(r) }} · <span dir="ltr">{{ r.sku }}</span></p>
          <p class="set-current">{{ 'admin.productDiscounts.current' | translate: { price: money(r.price_piastres) } }}</p>
          @if (error(); as e) {
            <p class="adm-notice is-error" role="alert">{{ e }}</p>
          }
          <fieldset class="set-choices">
            <legend>{{ 'admin.discounts.typeLabel' | translate }}</legend>
            <label><input type="radio" name="dsc-pd-type" value="percent" [checked]="draft().type === 'percent'" (change)="setType('percent')" />
              {{ 'admin.discounts.typePercent' | translate }}</label>
            <label><input type="radio" name="dsc-pd-type" value="fixed" [checked]="draft().type === 'fixed'" (change)="setType('fixed')" />
              {{ 'admin.discounts.typeFixed' | translate }}</label>
          </fieldset>
          <div class="set-field">
            <label for="dsc-pd-value">{{ (draft().type === 'percent' ? 'admin.discounts.valuePercent' : 'admin.discounts.valueFixed') | translate }}</label>
            <input #value id="dsc-pd-value" inputmode="decimal" dir="ltr" autocomplete="off" maxlength="16" [value]="draft().value"
              (input)="patch({ value: value.value })" [attr.aria-invalid]="!!problems().value" aria-describedby="dsc-pd-value-err" />
            <p class="set-error" id="dsc-pd-value-err">{{ problems().value }}</p>
          </div>
          <div class="set-field">
            <label for="dsc-pd-starts">{{ 'admin.discounts.starts' | translate }}</label>
            <input #starts id="dsc-pd-starts" type="datetime-local" dir="ltr" [value]="draft().starts" (input)="patch({ starts: starts.value })" />
          </div>
          <div class="set-field">
            <label for="dsc-pd-ends">{{ 'admin.discounts.ends' | translate }}</label>
            <input #ends id="dsc-pd-ends" type="datetime-local" dir="ltr" [value]="draft().ends" (input)="patch({ ends: ends.value })"
              [attr.aria-invalid]="!!problems().ends" aria-describedby="dsc-pd-dates-help dsc-pd-ends-err" />
            <p class="set-help" id="dsc-pd-dates-help">{{ 'admin.discounts.datesHelp' | translate }}</p>
            <p class="set-error" id="dsc-pd-ends-err">{{ problems().ends }}</p>
          </div>
          <label class="set-check">
            <input #active type="checkbox" [checked]="draft().active" (change)="patch({ active: active.checked })" />
            <span>
              <strong>{{ 'admin.productDiscounts.activeLabel' | translate }}</strong>
              <span class="set-help">{{ 'admin.productDiscounts.activeHelp' | translate }}</span>
            </span>
          </label>
          @if (preview(); as p) {
            <p class="set-note" aria-live="polite">{{ 'admin.productDiscounts.preview' | translate: p }}</p>
          }
          <p class="set-note">{{ 'admin.discounts.newOrdersOnly' | translate }}</p>
          <div class="set-dialog-actions">
            <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
            <button type="submit" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()">{{ 'admin.discounts.save' | translate }}</button>
          </div>
        </form>
      }
    </dialog>
  `,
  styleUrl: '../settings/admin-settings-dialog.css',
})
export class AdminProductDiscountDialog {
  private readonly api = inject(AdminDiscountsService);
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly saved = output<ProductDiscountRow>();
  /** Changed by someone else meanwhile: the current row, so the list can show it too. */
  readonly changed = output<ProductDiscountRow>();
  readonly sessionEnded = output<void>();

  protected readonly row = signal<ProductDiscountRow | null>(null);
  protected readonly draft = signal<Draft>({ type: 'percent', value: '', active: true, starts: '', ends: '' });
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The discount in piastres or percent, or NaN when the text is not valid. */
  private readonly amount = computed(() => {
    const d = this.draft();
    return d.type === 'percent' ? wholeNumber(d.value) : egpToPiastres(d.value);
  });

  protected readonly problems = computed(() => {
    const problems: { value?: string; ends?: string } = {};
    if (!this.submitted()) {
      return problems;
    }
    const d = this.draft();
    const amount = this.amount();
    const price = this.row()?.price_piastres ?? null;
    if (d.type === 'percent' && (amount === null || Number.isNaN(amount) || amount < 1 || amount > 99)) {
      problems.value = this.language.translate('admin.discounts.errPercent');
    } else if (d.type === 'fixed' && (amount === null || Number.isNaN(amount) || amount < 1)) {
      problems.value = this.language.translate('admin.discounts.errAmount');
    } else if (d.type === 'fixed' && price !== null && amount !== null && amount >= price) {
      problems.value = this.language.translate('admin.productDiscounts.errFixedHigh', { price: money(price, this.language) });
    }
    if (d.starts && d.ends && d.ends <= d.starts) {
      problems.ends = this.language.translate('admin.discounts.errDates');
    }
    return problems;
  });

  protected readonly preview = computed(() => {
    const price = this.row()?.price_piastres ?? null;
    const amount = this.amount();
    const d = this.draft();
    if (price === null || amount === null || Number.isNaN(amount) || amount < 1) {
      return null;
    }
    const off = d.type === 'percent' ? (amount > 99 ? null : Math.floor((price * amount) / 100)) : amount < price ? amount : null;
    return off === null ? null : { price: money(price - off, this.language), regular: money(price, this.language) };
  });

  open(row: ProductDiscountRow): void {
    this.reset(row);
    this.error.set(null);
    const element = this.dialog().nativeElement;
    if (!element.open) {
      typeof element.showModal === 'function' ? element.showModal() : element.setAttribute('open', '');
    }
  }

  protected close(): void {
    if (this.saving()) {
      return;
    }
    const element = this.dialog().nativeElement;
    if (element.open) {
      typeof element.close === 'function' ? element.close() : element.removeAttribute('open');
    }
  }

  protected setType(type: DiscountType): void {
    this.patch({ type });
  }

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  protected save(): void {
    const row = this.row();
    if (!row || this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.error.set(null);
    if (Object.keys(this.problems()).length) {
      return;
    }
    const d = this.draft();
    const change: ProductDiscountChange = {
      type: d.type,
      value: this.amount() as number,
      is_active: d.active,
      starts_at: inputValue(d.starts),
      ends_at: inputValue(d.ends),
    };
    this.saving.set(true);
    this.api.setProductDiscount(row.variant_id, change, row.discount).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.close();
        this.saved.emit(updated);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.close();
          this.sessionEnded.emit();
          return;
        }
        const current = changedMeanwhile<ProductDiscountRow>(error);
        if (current) {
          this.reset(current);
          this.changed.emit(current);
          this.error.set(this.language.translate('admin.discounts.changedMeanwhile'));
          return;
        }
        this.error.set([this.language.translate('admin.discounts.saveFailed'), ...apiErrorMessages(error)].join(' '));
      },
    });
  }

  protected money(piastres: number | null): string {
    return piastres === null ? this.language.translate('admin.productDiscounts.noPrice') : money(piastres, this.language);
  }

  protected name(row: ProductDiscountRow): string {
    const n = row.product.name;
    return (this.language.currentLanguage() === 'ar' ? n.ar || n.en : n.en || n.ar) ?? row.sku;
  }

  private reset(row: ProductDiscountRow): void {
    const d = row.discount;
    this.row.set(row);
    this.submitted.set(false);
    this.draft.set({
      type: d?.type ?? 'percent',
      value: d ? (d.type === 'percent' ? String(d.value) : piastresToEgp(d.value)) : '',
      active: d?.is_active ?? true,
      starts: cairoInput(d?.starts_at ?? null),
      ends: cairoInput(d?.ends_at ?? null),
    });
  }
}
