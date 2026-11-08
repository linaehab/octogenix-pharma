import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { apiErrorMessages } from '../products/api-errors';
import { egpToPiastres, piastresToEgp } from '../products/money';
import { changedMeanwhile } from '../settings/admin-settings.service';
import { DiscountType, MAX_PIASTRES, PromoCode, PromoCodeChange } from './admin-discounts.models';
import { AdminDiscountsService } from './admin-discounts.service';
import { cairoInput, inputValue, money, wholeNumber } from './discount-format';

interface Draft {
  code: string;
  description: string;
  type: DiscountType;
  value: string;
  minOrder: string;
  starts: string;
  ends: string;
  usageLimit: string;
  perCustomer: string;
  active: boolean;
}

type Problems = Partial<Record<'code' | 'value' | 'minOrder' | 'ends' | 'usageLimit' | 'perCustomer', string>>;

const EMPTY: Draft = {
  code: '', description: '', type: 'percent', value: '', minOrder: '', starts: '', ends: '', usageLimit: '', perCustomer: '', active: false,
};

/**
 * Creates or edits a promo code. The form checks what it can; the API validates again, keeps codes
 * unique and saves an edit only if nobody changed the code since it was opened.
 */
@Component({
  selector: 'app-admin-promo-code-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="set-dialog" aria-labelledby="dsc-pc-title" (cancel)="close()">
      <form (submit)="$event.preventDefault(); save()" novalidate>
        <h2 id="dsc-pc-title">{{ (promo() ? 'admin.promo.dialogEdit' : 'admin.promo.dialogNew') | translate }}</h2>
        @if (error(); as e) {
          <p class="adm-notice is-error" role="alert">{{ e }}</p>
        }
        <div class="set-field">
          <label for="dsc-pc-code">{{ 'admin.promo.codeLabel' | translate }}</label>
          <input #code id="dsc-pc-code" dir="ltr" autocomplete="off" maxlength="32" spellcheck="false" [value]="draft().code"
            (input)="patch({ code: code.value })" [attr.aria-invalid]="!!problems().code" aria-describedby="dsc-pc-code-help dsc-pc-code-err" />
          <p class="set-help" id="dsc-pc-code-help">{{ 'admin.promo.codeHelp' | translate }}</p>
          <p class="set-error" id="dsc-pc-code-err">{{ problems().code }}</p>
        </div>
        <div class="set-field">
          <label for="dsc-pc-desc">{{ 'admin.promo.descriptionLabel' | translate }}</label>
          <input #desc id="dsc-pc-desc" maxlength="255" [value]="draft().description" (input)="patch({ description: desc.value })" />
        </div>
        <fieldset class="set-choices">
          <legend>{{ 'admin.discounts.typeLabel' | translate }}</legend>
          <label><input type="radio" name="dsc-pc-type" value="percent" [checked]="draft().type === 'percent'" (change)="patch({ type: 'percent' })" />
            {{ 'admin.discounts.typePercent' | translate }}</label>
          <label><input type="radio" name="dsc-pc-type" value="fixed" [checked]="draft().type === 'fixed'" (change)="patch({ type: 'fixed' })" />
            {{ 'admin.discounts.typeFixed' | translate }}</label>
        </fieldset>
        <div class="set-field">
          <label for="dsc-pc-value">{{ (draft().type === 'percent' ? 'admin.discounts.valuePercent' : 'admin.discounts.valueFixed') | translate }}</label>
          <input #value id="dsc-pc-value" inputmode="decimal" dir="ltr" autocomplete="off" maxlength="16" [value]="draft().value"
            (input)="patch({ value: value.value })" [attr.aria-invalid]="!!problems().value" aria-describedby="dsc-pc-value-err" />
          <p class="set-error" id="dsc-pc-value-err">{{ problems().value }}</p>
        </div>
        <div class="set-field">
          <label for="dsc-pc-min">{{ 'admin.promo.minOrderLabel' | translate }}</label>
          <input #min id="dsc-pc-min" inputmode="decimal" dir="ltr" autocomplete="off" maxlength="16" [value]="draft().minOrder"
            (input)="patch({ minOrder: min.value })" [attr.aria-invalid]="!!problems().minOrder" aria-describedby="dsc-pc-min-help dsc-pc-min-err" />
          <p class="set-help" id="dsc-pc-min-help">{{ 'admin.promo.minOrderHelp' | translate }}</p>
          <p class="set-error" id="dsc-pc-min-err">{{ problems().minOrder }}</p>
        </div>
        <div class="set-field">
          <label for="dsc-pc-starts">{{ 'admin.discounts.starts' | translate }}</label>
          <input #starts id="dsc-pc-starts" type="datetime-local" dir="ltr" [value]="draft().starts" (input)="patch({ starts: starts.value })" />
        </div>
        <div class="set-field">
          <label for="dsc-pc-ends">{{ 'admin.discounts.ends' | translate }}</label>
          <input #ends id="dsc-pc-ends" type="datetime-local" dir="ltr" [value]="draft().ends" (input)="patch({ ends: ends.value })"
            [attr.aria-invalid]="!!problems().ends" aria-describedby="dsc-pc-dates-help dsc-pc-ends-err" />
          <p class="set-help" id="dsc-pc-dates-help">{{ 'admin.discounts.datesHelp' | translate }}</p>
          <p class="set-error" id="dsc-pc-ends-err">{{ problems().ends }}</p>
        </div>
        <div class="set-field">
          <label for="dsc-pc-limit">{{ 'admin.promo.usageLimitLabel' | translate }}</label>
          <input #limit id="dsc-pc-limit" inputmode="numeric" dir="ltr" autocomplete="off" maxlength="9" [value]="draft().usageLimit"
            (input)="patch({ usageLimit: limit.value })" [attr.aria-invalid]="!!problems().usageLimit" aria-describedby="dsc-pc-limit-err" />
          <p class="set-error" id="dsc-pc-limit-err">{{ problems().usageLimit }}</p>
        </div>
        <div class="set-field">
          <label for="dsc-pc-per">{{ 'admin.promo.perCustomerLabel' | translate }}</label>
          <input #per id="dsc-pc-per" inputmode="numeric" dir="ltr" autocomplete="off" maxlength="4" [value]="draft().perCustomer"
            (input)="patch({ perCustomer: per.value })" [attr.aria-invalid]="!!problems().perCustomer" aria-describedby="dsc-pc-limits-help dsc-pc-per-err" />
          <p class="set-help" id="dsc-pc-limits-help">{{ 'admin.promo.limitsHelp' | translate }}</p>
          <p class="set-error" id="dsc-pc-per-err">{{ problems().perCustomer }}</p>
        </div>
        <label class="set-check">
          <input #active type="checkbox" [checked]="draft().active" (change)="patch({ active: active.checked })" />
          <span>
            <strong>{{ 'admin.promo.activeLabel' | translate }}</strong>
            <span class="set-help">{{ 'admin.promo.activeHelp' | translate }}</span>
          </span>
        </label>
        @if (promo()?.usage; as u) {
          <div class="set-note">
            <strong>{{ 'admin.promo.usageTitle' | translate }}</strong>
            <ul class="set-review">
              <li>{{ 'admin.promo.usageCounted' | translate: { count: u.orders_counted } }}</li>
              <li>{{ 'admin.promo.usageReleased' | translate: { count: u.orders_released } }}</li>
              <li>{{ 'admin.promo.usageGiven' | translate: { amount: money(u.discount_given_piastres) } }}</li>
            </ul>
          </div>
        }
        <p class="set-note">{{ 'admin.discounts.noStacking' | translate }} {{ 'admin.discounts.newOrdersOnly' | translate }}</p>
        <div class="set-dialog-actions">
          <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
          <button type="submit" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()">{{ 'admin.discounts.save' | translate }}</button>
        </div>
      </form>
    </dialog>
  `,
  styleUrl: '../settings/admin-settings-dialog.css',
})
export class AdminPromoCodeDialog {
  private readonly api = inject(AdminDiscountsService);
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  /** The saved code and whether it was new. */
  readonly saved = output<{ promo: PromoCode; created: boolean }>();
  readonly changed = output<PromoCode>();
  readonly sessionEnded = output<void>();

  /** The code being edited (null while creating). */
  protected readonly promo = signal<PromoCode | null>(null);
  protected readonly draft = signal<Draft>(EMPTY);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly values = computed(() => {
    const d = this.draft();
    return {
      code: d.code.trim().toUpperCase(),
      value: d.type === 'percent' ? wholeNumber(d.value) : egpToPiastres(d.value),
      minOrder: egpToPiastres(d.minOrder),
      usageLimit: wholeNumber(d.usageLimit),
      perCustomer: wholeNumber(d.perCustomer),
    };
  });

  protected readonly problems = computed<Problems>(() => {
    if (!this.submitted()) {
      return {};
    }
    const d = this.draft();
    const v = this.values();
    const problems: Problems = {};
    if (!/^[A-Z0-9_-]{3,32}$/.test(v.code)) {
      problems.code = this.language.translate('admin.promo.errCode');
    }
    if (d.type === 'percent' && (v.value === null || Number.isNaN(v.value) || v.value < 1 || v.value > 99)) {
      problems.value = this.language.translate('admin.discounts.errPercent');
    } else if (d.type === 'fixed' && (v.value === null || Number.isNaN(v.value) || v.value < 1 || v.value > MAX_PIASTRES)) {
      problems.value = this.language.translate('admin.discounts.errAmount');
    }
    if (v.minOrder !== null && (Number.isNaN(v.minOrder) || v.minOrder < 1 || v.minOrder > MAX_PIASTRES)) {
      problems.minOrder = this.language.translate('admin.discounts.errAmount');
    }
    if (d.starts && d.ends && d.ends <= d.starts) {
      problems.ends = this.language.translate('admin.discounts.errDates');
    }
    if (v.usageLimit !== null && (Number.isNaN(v.usageLimit) || v.usageLimit < 1)) {
      problems.usageLimit = this.language.translate('admin.promo.errLimit');
    }
    if (v.perCustomer !== null && (Number.isNaN(v.perCustomer) || v.perCustomer < 1)) {
      problems.perCustomer = this.language.translate('admin.promo.errLimit');
    } else if (v.perCustomer !== null && v.usageLimit !== null && !Number.isNaN(v.usageLimit) && v.perCustomer > v.usageLimit) {
      problems.perCustomer = this.language.translate('admin.promo.errPerCustomer');
    }
    return problems;
  });

  open(promo: PromoCode | null): void {
    this.reset(promo);
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

  protected patch(change: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  protected save(): void {
    if (this.saving()) {
      return;
    }
    this.submitted.set(true);
    this.error.set(null);
    if (Object.keys(this.problems()).length) {
      return;
    }
    const d = this.draft();
    const v = this.values();
    const existing = this.promo();
    const change: PromoCodeChange = {
      code: v.code,
      description: d.description.trim() || null,
      discount_type: d.type,
      discount_value: v.value as number,
      min_order_piastres: v.minOrder,
      starts_at: inputValue(d.starts),
      ends_at: inputValue(d.ends),
      usage_limit: v.usageLimit,
      per_customer_limit: v.perCustomer,
      is_active: d.active,
    };
    if (existing) {
      change.expected_updated_at = existing.updated_at;
    }
    this.saving.set(true);
    const request = existing ? this.api.updatePromoCode(existing.id, change) : this.api.createPromoCode(change);
    request.subscribe({
      next: (promo) => {
        this.saving.set(false);
        this.close();
        this.saved.emit({ promo, created: !existing });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.close();
          this.sessionEnded.emit();
          return;
        }
        const current = changedMeanwhile<PromoCode>(error);
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

  protected money(piastres: number): string {
    return money(piastres, this.language);
  }

  private reset(promo: PromoCode | null): void {
    this.promo.set(promo);
    this.submitted.set(false);
    this.draft.set(
      promo
        ? {
            code: promo.code,
            description: promo.description ?? '',
            type: promo.discount_type,
            value: promo.discount_type === 'percent' ? String(promo.discount_value) : piastresToEgp(promo.discount_value),
            minOrder: piastresToEgp(promo.min_order_piastres),
            starts: cairoInput(promo.starts_at),
            ends: cairoInput(promo.ends_at),
            usageLimit: promo.usage_limit === null ? '' : String(promo.usage_limit),
            perCustomer: promo.per_customer_limit === null ? '' : String(promo.per_customer_limit),
            active: promo.is_active,
          }
        : EMPTY,
    );
  }
}
