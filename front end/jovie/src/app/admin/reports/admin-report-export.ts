import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export type ExportFormat = 'csv' | 'xlsx';

/**
 * The export buttons of a report (CSV and Excel): one download at a time (both buttons wait while
 * the server prepares a file), then a success or error message. The server builds both files with
 * the report's own filters and calculations.
 */
@Component({
  selector: 'app-admin-report-export',
  imports: [TranslatePipe],
  template: `
    <div class="rep-export">
      <button type="button" class="adm-button is-light rep-export-csv" [disabled]="!!busy() || disabled()" [attr.aria-busy]="busy() === 'csv'" (click)="start('csv')">
        {{ (busy() === 'csv' ? 'admin.reports.exporting' : 'admin.reports.export') | translate }}
      </button>
      <button type="button" class="adm-button is-light rep-export-xlsx" [disabled]="!!busy() || disabled()" [attr.aria-busy]="busy() === 'xlsx'" (click)="start('xlsx')">
        {{ (busy() === 'xlsx' ? 'admin.reports.exporting' : 'admin.reports.exportExcel') | translate }}
      </button>
      <p class="rep-export-msg" role="status" aria-live="polite">
        @if (done(); as name) {
          <span class="is-ok">{{ 'admin.reports.exported' | translate: { name } }}</span>
        } @else if (failed()) {
          <span class="is-error">{{ 'admin.reports.exportFailed' | translate }}</span>
        }
      </p>
    </div>
  `,
  styles: `
    .rep-export {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem 0.8rem;
    }

    .rep-export-msg {
      margin: 0;
      font-size: 0.88rem;
    }

    .is-ok {
      color: #0b5a46;
      font-weight: 700;
    }

    .is-error {
      color: #a3123d;
      font-weight: 700;
    }
  `,
})
export class AdminReportExport {
  /** Starts the download in the given format; emits the saved file name. */
  readonly run = input.required<(format: ExportFormat) => Observable<string>>();
  readonly disabled = input(false);
  readonly sessionEnded = output<void>();

  /** The format being prepared, or null. */
  protected readonly busy = signal<ExportFormat | null>(null);
  protected readonly done = signal<string | null>(null);
  protected readonly failed = signal(false);
  private request: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected start(format: ExportFormat): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(format);
    this.done.set(null);
    this.failed.set(false);
    this.request = this.run()(format).subscribe({
      next: (name) => {
        this.busy.set(null);
        this.done.set(name);
      },
      error: (error: unknown) => {
        this.busy.set(null);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.sessionEnded.emit();
          return;
        }
        this.failed.set(true);
      },
    });
  }

  /** Clears the message when the report changes (period or filters). */
  reset(): void {
    this.done.set(null);
    this.failed.set(false);
  }
}
