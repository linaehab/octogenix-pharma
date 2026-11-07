import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface ConfirmOptions {
  /** Translation keys (with optional parameters). */
  title: string;
  message: string;
  confirm: string;
  params?: Record<string, string | number>;
  /** Extra lines under the message (already translated). */
  details?: string[];
  tone?: 'default' | 'danger';
}

/**
 * Confirmation for important actions, on the native modal <dialog> (focus stays inside, Escape
 * cancels). `ask()` resolves true only when the admin presses the confirm button.
 */
@Component({
  selector: 'app-admin-confirm-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="adm-dialog" aria-labelledby="adm-dialog-title" aria-describedby="adm-dialog-text" (close)="settle(false)" (cancel)="settle(false)">
      @if (options(); as o) {
        <h2 id="adm-dialog-title">{{ o.title | translate: o.params }}</h2>
        <p id="adm-dialog-text">{{ o.message | translate: o.params }}</p>
        @if (o.details?.length) {
          <ul>
            @for (line of o.details; track $index) {
              <li>{{ line }}</li>
            }
          </ul>
        }
        <div class="adm-dialog-actions">
          <button type="button" class="adm-button is-light" (click)="settle(false)">{{ 'admin.dialog.cancel' | translate }}</button>
          <button type="button" class="adm-button" [class.is-danger]="o.tone === 'danger'" (click)="settle(true)">{{ o.confirm | translate: o.params }}</button>
        </div>
      }
    </dialog>
  `,
  styles: `
    .adm-dialog {
      width: min(30rem, calc(100vw - 2rem));
      padding: 1.5rem;
      border: 0;
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(14, 22, 46, 0.3);
      color: var(--adm-text, #1d2a4d);
    }

    .adm-dialog::backdrop {
      background: rgba(14, 22, 46, 0.5);
    }

    h2 {
      margin: 0 0 0.6rem;
      color: var(--adm-navy, #203366);
      font-size: 1.25rem;
    }

    p,
    ul {
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    ul {
      padding-inline-start: 1.2rem;
      color: var(--adm-muted, #56627e);
    }

    .adm-dialog-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.6rem;
    }

    .adm-button.is-danger {
      background: #a3123d;
    }
  `,
})
export class AdminConfirmDialog {
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly options = signal<ConfirmOptions | null>(null);
  private resolve: ((answer: boolean) => void) | null = null;

  ask(options: ConfirmOptions): Promise<boolean> {
    this.resolve?.(false);
    this.options.set(options);
    const element = this.dialog().nativeElement;
    if (!element.open) {
      // showModal is missing in some test environments; fall back to the open attribute.
      typeof element.showModal === 'function' ? element.showModal() : element.setAttribute('open', '');
    }
    return new Promise((resolve) => (this.resolve = resolve));
  }

  protected settle(answer: boolean): void {
    const resolve = this.resolve;
    this.resolve = null;
    const element = this.dialog().nativeElement;
    if (element.open) {
      typeof element.close === 'function' ? element.close() : element.removeAttribute('open');
    }
    resolve?.(answer);
  }
}
