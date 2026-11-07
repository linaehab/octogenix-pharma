import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * The "Export CSV" button of a report: one download at a time, a busy state while the server
 * prepares the file, then a success or error message.
 */
@Component({
  selector: 'app-admin-report-export',
  imports: [TranslatePipe],
  template: `
    <div class="rep-export">
      <button type="button" class="adm-button is-light" [disabled]="busy() || disabled()" [attr.aria-busy]="busy()" (click)="start()">
        {{ (busy() ? 'admin.reports.exporting' : 'admin.reports.export') | translate }}
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
  /** Starts the download; emits the saved file name. */
  readonly run = input.required<() => Observable<string>>();
  readonly disabled = input(false);
  readonly sessionEnded = output<void>();

  protected readonly busy = signal(false);
  protected readonly done = signal<string | null>(null);
  protected readonly failed = signal(false);
  private request: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected start(): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.done.set(null);
    this.failed.set(false);
    this.request = this.run()().subscribe({
      next: (name) => {
        this.busy.set(false);
        this.done.set(name);
      },
      error: (error: unknown) => {
        this.busy.set(false);
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
