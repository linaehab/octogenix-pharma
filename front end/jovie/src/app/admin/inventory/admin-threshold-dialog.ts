import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { apiErrorMessages } from '../products/api-errors';
import { StockRow } from './admin-inventory.models';
import { AdminInventoryService } from './admin-inventory.service';

/**
 * Sets (or clears) a product's low-stock level. It changes no stock and records no movement:
 * it only decides when the product counts as "low stock".
 */
@Component({
  selector: 'app-admin-threshold-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="inv-dialog" aria-labelledby="inv-threshold-title" (cancel)="close()">
      @if (row(); as r) {
        <form (submit)="$event.preventDefault(); save(level.value)" novalidate>
          <h2 id="inv-threshold-title">{{ 'admin.inventory.thresholdTitle' | translate }}</h2>
          <p class="inv-dialog-product">{{ name(r) }} · <bdi dir="ltr">{{ r.sku }}</bdi></p>
          <p class="inv-help">{{ 'admin.inventory.thresholdHelp' | translate }}</p>
          @if (error(); as e) {
            <p class="adm-notice is-error" role="alert">{{ e }}</p>
          }
          <div class="inv-field">
            <label for="inv-threshold">{{ 'admin.inventory.threshold' | translate }}</label>
            <input #level id="inv-threshold" inputmode="numeric" dir="ltr" autocomplete="off" [value]="r.low_stock_threshold ?? ''"
              [attr.aria-invalid]="!!problem()" aria-describedby="inv-threshold-err" />
            <p class="inv-help">{{ 'admin.inventory.thresholdEmpty' | translate }}</p>
            <p class="inv-error" id="inv-threshold-err">{{ problem() }}</p>
          </div>
          <div class="inv-dialog-actions">
            <button type="button" class="adm-button is-light" (click)="close()">{{ 'admin.dialog.cancel' | translate }}</button>
            <button type="submit" class="adm-button" [disabled]="saving()" [attr.aria-busy]="saving()">{{ 'admin.inventory.thresholdSave' | translate }}</button>
          </div>
        </form>
      }
    </dialog>
  `,
  styleUrl: './admin-stock-adjust-dialog.css',
})
export class AdminThresholdDialog {
  private readonly api = inject(AdminInventoryService);
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly saved = output<StockRow>();
  readonly sessionEnded = output<void>();

  protected readonly row = signal<StockRow | null>(null);
  protected readonly saving = signal(false);
  protected readonly problem = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  open(row: StockRow): void {
    this.row.set(row);
    this.problem.set(null);
    this.error.set(null);
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

  protected save(text: string): void {
    const row = this.row();
    const value = text.trim();
    if (!row || this.saving()) {
      return;
    }
    if (value !== '' && !(/^\d{1,7}$/.test(value) && Number(value) <= 1000000)) {
      this.problem.set(this.language.translate('admin.inventory.errThreshold'));
      return;
    }
    this.problem.set(null);
    this.saving.set(true);
    this.api.setThreshold(row.variant_id, value === '' ? null : Number(value)).subscribe({
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
        this.error.set([this.language.translate('admin.inventory.thresholdFailed'), ...apiErrorMessages(error)].join(' '));
      },
    });
  }

  protected name(row: StockRow): string {
    return (this.language.currentLanguage() === 'ar' ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? row.sku;
  }
}
