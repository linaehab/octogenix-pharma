import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Injector, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatPrice } from '../../jovie/data/format-price';
import { apiErrorMessages } from '../products/api-errors';
import { egpToPiastres, piastresToEgp } from '../products/money';
import { AdminGovernorate, GovernorateChange, MAX_PIASTRES } from './admin-settings.models';
import { AdminSettingsService, changedMeanwhile } from './admin-settings.service';

interface Pending {
  fee: number | null;
  deliver: boolean;
}

/**
 * Edits one governorate's shipping fee and delivery switch in two steps: the form, then a review
 * of exactly what changes (confirmed before anything is sent). The API saves only if the values
 * the admin saw are still current, and the change applies to new orders only.
 */
@Component({
  selector: 'app-admin-shipping-fee-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="set-dialog" aria-labelledby="set-fee-title" (cancel)="close()">
      @if (row(); as r) {
        @if (step() === 'edit') {
          <form (submit)="$event.preventDefault(); review(fee.value, deliver.checked)" novalidate>
            <h2 id="set-fee-title">{{ 'admin.shipping.editTitle' | translate }}</h2>
            <p class="set-dialog-name"><span lang="en" dir="ltr">{{ r.name_en }}</span> · <span lang="ar" dir="rtl">{{ r.name_ar }}</span></p>
            <p class="set-current">{{ 'admin.shipping.current' | translate: { fee: money(r.shipping_fee_piastres), status: status(r.is_deliverable) } }}</p>
            @if (error(); as e) {
              <p class="adm-notice is-error" role="alert">{{ e }}</p>
            }
            <div class="set-field">
              <label for="set-fee">{{ 'admin.shipping.feeLabel' | translate }}</label>
              <input #fee id="set-fee" inputmode="decimal" dir="ltr" autocomplete="off" maxlength="16" [value]="draft().fee"
                [attr.aria-invalid]="!!problem()" aria-describedby="set-fee-help set-fee-err" />
              <p class="set-help" id="set-fee-help">{{ 'admin.shipping.feeHelp' | translate }}</p>
              <p class="set-error" id="set-fee-err">{{ problem() }}</p>
            </div>
            <label class="set-check">
              <input #deliver type="checkbox" [checked]="draft().deliver" />
              <span>
                <strong>{{ 'admin.shipping.deliverLabel' | translate }}</strong>
                <span class="set-help">{{ 'admin.shipping.deliverHelp' | translate }}</span>
              </span>
            </label>
            <p class="set-note">{{ 'admin.shipping.newOrdersOnly' | translate }}</p>
            <div class="set-dialog-actions">
              <button type="button" class="adm-button is-light" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
              <button type="submit" class="adm-button">{{ 'admin.settings.review' | translate }}</button>
            </div>
          </form>
        } @else if (pending(); as p) {
          <h2 id="set-fee-title">{{ 'admin.settings.reviewTitle' | translate }}</h2>
          <p class="set-dialog-name"><span lang="en" dir="ltr">{{ r.name_en }}</span> · <span lang="ar" dir="rtl">{{ r.name_ar }}</span></p>
          @if (error(); as e) {
            <p class="adm-notice is-error" role="alert">{{ e }}</p>
          }
          <ul class="set-review">
            @if (p.fee !== r.shipping_fee_piastres) {
              <li>{{ 'admin.shipping.reviewFee' | translate: { from: money(r.shipping_fee_piastres), to: money(p.fee) } }}</li>
            }
            @if (p.deliver !== r.is_deliverable) {
              <li>{{ 'admin.shipping.reviewDelivery' | translate: { from: onOff(r.is_deliverable), to: onOff(p.deliver) } }}</li>
            }
          </ul>
          @if (p.deliver !== r.is_deliverable) {
            <p class="set-note is-warning">{{ (p.deliver ? 'admin.shipping.reviewOn' : 'admin.shipping.reviewOff') | translate: { name: name(r) } }}</p>
          }
          <p class="set-note">{{ 'admin.shipping.newOrdersOnly' | translate }}</p>
          <div class="set-dialog-actions">
            <button type="button" class="adm-button is-light" [disabled]="saving()" (click)="back()">{{ 'admin.settings.back' | translate }}</button>
            <button #confirm type="button" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()" (click)="save()">{{ 'admin.settings.confirmSave' | translate }}</button>
          </div>
        }
      }
    </dialog>
  `,
  styleUrl: './admin-settings-dialog.css',
})
export class AdminShippingFeeDialog {
  private readonly api = inject(AdminSettingsService);
  private readonly language = inject(LanguageService);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly confirmButton = viewChild<ElementRef<HTMLButtonElement>>('confirm');
  private readonly feeInput = viewChild<ElementRef<HTMLInputElement>>('fee');

  /** The governorate as saved by the API. */
  readonly saved = output<AdminGovernorate>();
  /** Someone else changed it meanwhile: its current values, so the list can show them too. */
  readonly changed = output<AdminGovernorate>();
  readonly sessionEnded = output<void>();

  protected readonly row = signal<AdminGovernorate | null>(null);
  protected readonly step = signal<'edit' | 'review'>('edit');
  protected readonly draft = signal({ fee: '', deliver: false });
  protected readonly pending = signal<Pending | null>(null);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  open(row: AdminGovernorate): void {
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

  protected review(feeText: string, deliver: boolean): void {
    const row = this.row();
    if (!row) {
      return;
    }
    this.draft.set({ fee: feeText, deliver });
    this.error.set(null);
    const fee = egpToPiastres(feeText);
    if (fee !== null && Number.isNaN(fee)) {
      this.problem.set(this.language.translate('admin.shipping.errFee'));
      return;
    }
    if (fee !== null && fee > MAX_PIASTRES) {
      this.problem.set(this.language.translate('admin.shipping.errFeeMax'));
      return;
    }
    if (deliver && fee === null) {
      this.problem.set(this.language.translate('admin.shipping.errFeeNeeded'));
      return;
    }
    this.problem.set(null);
    if (fee === row.shipping_fee_piastres && deliver === row.is_deliverable) {
      this.error.set(this.language.translate('admin.settings.unchanged'));
      return;
    }
    this.pending.set({ fee, deliver });
    this.step.set('review');
    afterNextRender(() => this.confirmButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected back(): void {
    this.step.set('edit');
    this.error.set(null);
    afterNextRender(() => this.feeInput()?.nativeElement.focus(), { injector: this.injector });
  }

  protected save(): void {
    const row = this.row();
    const pending = this.pending();
    if (!row || !pending || this.saving()) {
      return;
    }
    const change: GovernorateChange = {
      expected_shipping_fee_piastres: row.shipping_fee_piastres,
      expected_is_deliverable: row.is_deliverable,
    };
    if (pending.fee !== row.shipping_fee_piastres) {
      change.shipping_fee_piastres = pending.fee;
    }
    if (pending.deliver !== row.is_deliverable) {
      change.is_deliverable = pending.deliver;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.updateGovernorate(row.id, change).subscribe({
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
        const current = changedMeanwhile<AdminGovernorate>(error);
        if (current) {
          this.reset(current);
          this.changed.emit(current);
          this.error.set(this.language.translate('admin.settings.changedMeanwhile'));
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 422) {
          this.step.set('edit');
        }
        this.error.set([this.language.translate('admin.settings.saveFailed'), ...apiErrorMessages(error)].join(' '));
      },
    });
  }

  protected money(piastres: number | null): string {
    return piastres === null
      ? this.language.translate('admin.shipping.noFee')
      : formatPrice({ amount_piastres: piastres, currency: 'EGP' }, this.language.currentLanguage());
  }

  protected status(on: boolean): string {
    return this.language.translate(on ? 'admin.shipping.statusOn' : 'admin.shipping.statusOff');
  }

  protected onOff(on: boolean): string {
    return this.language.translate(on ? 'admin.settings.on' : 'admin.settings.off');
  }

  protected name(row: AdminGovernorate): string {
    return this.language.currentLanguage() === 'ar' ? row.name_ar : row.name_en;
  }

  private reset(row: AdminGovernorate): void {
    this.row.set(row);
    this.draft.set({ fee: piastresToEgp(row.shipping_fee_piastres), deliver: row.is_deliverable });
    this.pending.set(null);
    this.step.set('edit');
    this.problem.set(null);
  }
}
