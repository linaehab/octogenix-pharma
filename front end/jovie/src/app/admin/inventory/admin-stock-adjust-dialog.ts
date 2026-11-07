import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AdminConfirmDialog } from '../components/admin-confirm-dialog';
import { apiErrorMessages, apiFieldErrors } from '../products/api-errors';
import { ManualReason, StockAdjustment, StockRow } from './admin-inventory.models';
import { AdminInventoryService } from './admin-inventory.service';

type Direction = 'increase' | 'decrease' | 'count';

/** Reasons offered for each kind of change (the API's manual reasons). */
const REASONS: Record<Direction, ManualReason[]> = {
  increase: ['restock', 'manual_adjustment'],
  decrease: ['write_off', 'manual_adjustment'],
  count: ['stock_count_correction'],
};

/** A whole number from 0 (or 1) to 1,000,000, typed as text. */
function wholeNumber(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const text = String(control.value ?? '').trim();
    if (text === '') {
      return null;
    }
    return /^\d{1,7}$/.test(text) && Number(text) >= min && Number(text) <= 1000000 ? null : { wholeNumber: { min } };
  };
}

/**
 * Records one stock adjustment for a product: increase, decrease or a physical count, with a
 * reason and (except for a new shipment) a mandatory note. Shows the result before saving, asks
 * for confirmation, and sends the stock the admin saw so a changed stock is never overwritten.
 */
@Component({
  selector: 'app-admin-stock-adjust-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, AdminConfirmDialog],
  templateUrl: './admin-stock-adjust-dialog.html',
  styleUrl: './admin-stock-adjust-dialog.css',
})
export class AdminStockAdjustDialog {
  private readonly api = inject(AdminInventoryService);
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly confirm = viewChild.required(AdminConfirmDialog);

  /** The new stock after a successful adjustment. */
  readonly saved = output<{ row: StockRow; stock: number }>();
  /** The API answered 401. */
  readonly sessionEnded = output<void>();

  protected readonly row = signal<StockRow | null>(null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<{ text: string; details: string[] } | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    direction: ['increase' as Direction],
    reason: ['restock' as ManualReason, Validators.required],
    quantity: ['', wholeNumber(1)],
    note: ['', Validators.maxLength(500)],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly reasons = computed(() => REASONS[(this.value().direction ?? 'increase') as Direction]);
  protected readonly isCount = computed(() => this.value().direction === 'count');
  protected readonly noteRequired = computed(() => this.value().reason !== 'restock');

  /** The stock after saving, or null while the quantity is not valid yet. */
  protected readonly result = computed(() => {
    const row = this.row();
    const text = String(this.value().quantity ?? '').trim();
    if (!row || !/^\d{1,7}$/.test(text)) {
      return null;
    }
    const n = Number(text);
    const direction = this.value().direction;
    return direction === 'count' ? n : direction === 'decrease' ? row.stock_quantity - n : row.stock_quantity + n;
  });

  constructor() {
    // Keep the reason valid for the chosen kind of change.
    this.form.controls.direction.valueChanges.subscribe((direction) => {
      const allowed = REASONS[direction];
      if (!allowed.includes(this.form.controls.reason.value)) {
        this.form.controls.reason.setValue(allowed[0]);
      }
    });
  }

  open(row: StockRow): void {
    this.row.set(row);
    this.error.set(null);
    this.submitted.set(false);
    this.saving.set(false);
    this.form.reset({ direction: 'increase', reason: 'restock', quantity: '', note: '' });
    const element = this.dialog().nativeElement;
    if (!element.open) {
      typeof element.showModal === 'function' ? element.showModal() : element.setAttribute('open', '');
    }
  }

  protected close(): void {
    const element = this.dialog().nativeElement;
    if (element.open) {
      typeof element.close === 'function' ? element.close() : element.removeAttribute('open');
    }
  }

  protected problem(name: 'quantity' | 'note'): string | null {
    if (!this.submitted() && !this.form.controls[name].touched) {
      return null;
    }
    const value = String(this.form.controls[name].value ?? '').trim();
    if (name === 'quantity') {
      if (value === '') return this.language.translate('admin.inventory.errQuantityRequired');
      if (this.form.controls.quantity.errors?.['wholeNumber']) {
        return this.language.translate(this.isCount() ? 'admin.inventory.errCount' : 'admin.inventory.errQuantity');
      }
      const result = this.result();
      if (result !== null && result < 0) return this.language.translate('admin.inventory.errBelowZero', { count: this.row()!.stock_quantity });
      if (this.isCount() && result === this.row()?.stock_quantity) return this.language.translate('admin.inventory.errSameCount');
      return this.form.controls.quantity.errors?.['server'] ?? null;
    }
    if (this.noteRequired() && value === '') return this.language.translate('admin.inventory.errNoteRequired');
    if (this.form.controls.note.errors?.['maxlength']) return this.language.translate('admin.products.errMax', { max: 500 });
    return this.form.controls.note.errors?.['server'] ?? null;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set(null);
    const row = this.row();
    if (!row || this.saving() || this.problem('quantity') || this.problem('note')) {
      return;
    }
    const { direction, reason, quantity, note } = this.form.getRawValue();
    const amount = Number(quantity);
    const after = this.result()!;
    const ok = await this.confirm().ask({
      title: 'admin.inventory.confirmTitle',
      message: direction === 'count' ? 'admin.inventory.confirmCount' : direction === 'decrease' ? 'admin.inventory.confirmDecrease' : 'admin.inventory.confirmIncrease',
      confirm: 'admin.inventory.confirmSave',
      params: { count: this.count(amount), name: this.name(row), before: this.count(row.stock_quantity), after: this.count(after) },
    });
    if (!ok) {
      return;
    }

    const adjustment: StockAdjustment = { reason, note: note.trim() || null, expected_stock: row.stock_quantity };
    if (direction === 'count') {
      adjustment.counted_quantity = amount;
    } else {
      // Write-offs are sent as a positive quantity; a correction carries its sign.
      adjustment.quantity = reason === 'manual_adjustment' && direction === 'decrease' ? -amount : amount;
    }

    this.saving.set(true);
    this.api.adjust(row.variant_id, adjustment).subscribe({
      next: (stock) => {
        this.saving.set(false);
        this.close();
        this.saved.emit({ row, stock });
      },
      error: (error: unknown) => {
        this.saving.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.close();
          this.sessionEnded.emit();
          return;
        }
        if (error instanceof HttpErrorResponse && error.status === 409) {
          // The stock changed meanwhile: show the current value; nothing was saved.
          const current = Number((error.error as { current_stock?: number })?.current_stock);
          if (Number.isFinite(current)) {
            this.row.set({ ...row, stock_quantity: current });
          }
          this.error.set({ text: this.language.translate('admin.inventory.changedMeanwhile', { count: this.count(current) }), details: [] });
          return;
        }
        const fields = apiFieldErrors(error);
        for (const [key, messages] of Object.entries(fields)) {
          const control = key === 'counted_quantity' ? this.form.controls.quantity : this.form.get(key);
          control?.setErrors({ ...(control.errors ?? {}), server: messages[0] });
        }
        this.error.set({ text: this.language.translate('admin.inventory.adjustFailed'), details: apiErrorMessages(error) });
      },
    });
  }

  protected name(row: StockRow): string {
    return (this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? row.sku;
  }

  protected count(value: number): string {
    return new Intl.NumberFormat(this.language.currentLanguage() === 'ar' ? 'ar-EG' : 'en-GB').format(value);
  }
}
