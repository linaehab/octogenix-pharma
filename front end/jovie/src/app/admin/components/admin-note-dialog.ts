import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

export interface NoteDialogOptions {
  /** Translation keys with optional parameters. */
  title: string;
  message: string;
  confirm: string;
  params?: Record<string, string | number>;
  noteLabel: string;
  noteRequired?: boolean;
  noteHelp?: string;
  tone?: 'default' | 'danger';
}

/**
 * Confirmation with a note (optional or required), on the native modal <dialog>. `ask()` resolves
 * with the note ('' when none was given) or null when the admin cancels.
 */
@Component({
  selector: 'app-admin-note-dialog',
  imports: [TranslatePipe],
  template: `
    <dialog #dialog class="adm-note-dialog" aria-labelledby="adm-note-title" aria-describedby="adm-note-text" (cancel)="settle(null)">
      @if (options(); as o) {
        <form (submit)="$event.preventDefault(); submit(note.value)" novalidate>
          <h2 id="adm-note-title">{{ o.title | translate: o.params }}</h2>
          <p id="adm-note-text">{{ o.message | translate: o.params }}</p>
          <label for="adm-note-input">{{ o.noteLabel | translate }} @if (o.noteRequired) {<span class="adm-note-req">*</span>}</label>
          <textarea #note id="adm-note-input" rows="3" maxlength="1000" [attr.aria-invalid]="!!problem()" aria-describedby="adm-note-help adm-note-err"></textarea>
          @if (o.noteHelp) {
            <p class="adm-note-help" id="adm-note-help">{{ o.noteHelp | translate }}</p>
          }
          <p class="adm-note-error" id="adm-note-err">{{ problem() }}</p>
          <div class="adm-note-actions">
            <button type="button" class="adm-button is-light" (click)="settle(null)">{{ 'admin.dialog.cancel' | translate }}</button>
            <button type="submit" class="adm-button" [class.is-danger]="o.tone === 'danger'">{{ o.confirm | translate: o.params }}</button>
          </div>
        </form>
      }
    </dialog>
  `,
  styles: `
    .adm-note-dialog {
      width: min(32rem, calc(100vw - 2rem));
      padding: 1.5rem;
      border: 0;
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(14, 22, 46, 0.3);
      color: var(--adm-text, #1d2a4d);
    }

    .adm-note-dialog::backdrop {
      background: rgba(14, 22, 46, 0.5);
    }

    h2 {
      margin: 0 0 0.6rem;
      color: var(--adm-navy, #203366);
      font-size: 1.25rem;
    }

    p {
      margin: 0 0 1rem;
      line-height: 1.5;
    }

    label {
      display: block;
      margin-bottom: 0.3rem;
      font-weight: 700;
    }

    textarea {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border: 1px solid rgba(32, 51, 102, 0.35);
      border-radius: 10px;
      color: inherit;
      font: inherit;
    }

    textarea[aria-invalid='true'] {
      border-color: #a3123d;
      box-shadow: 0 0 0 1px #a3123d;
    }

    .adm-note-help {
      margin: 0.3rem 0 0;
      color: var(--adm-muted, #56627e);
      font-size: 0.88rem;
    }

    .adm-note-error {
      min-height: 1.2rem;
      margin: 0.3rem 0 0.6rem;
      color: #a3123d;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .adm-note-req {
      color: #a3123d;
    }

    .adm-note-actions {
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
export class AdminNoteDialog {
  private readonly language = inject(LanguageService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly options = signal<NoteDialogOptions | null>(null);
  protected readonly problem = signal<string | null>(null);
  private resolve: ((note: string | null) => void) | null = null;

  ask(options: NoteDialogOptions): Promise<string | null> {
    this.resolve?.(null);
    this.problem.set(null);
    this.options.set(options);
    const element = this.dialog().nativeElement;
    // Clear the previous note once the form is rendered.
    queueMicrotask(() => {
      const input = element.querySelector('textarea');
      if (input) {
        input.value = '';
      }
    });
    if (!element.open) {
      typeof element.showModal === 'function' ? element.showModal() : element.setAttribute('open', '');
    }
    return new Promise((resolve) => (this.resolve = resolve));
  }

  protected submit(note: string): void {
    const value = note.trim();
    if (this.options()?.noteRequired && value === '') {
      this.problem.set(this.language.translate('admin.orders.errReasonRequired'));
      return;
    }
    this.settle(value);
  }

  protected settle(answer: string | null): void {
    const resolve = this.resolve;
    this.resolve = null;
    const element = this.dialog().nativeElement;
    if (element.open) {
      typeof element.close === 'function' ? element.close() : element.removeAttribute('open');
    }
    resolve?.(answer);
  }
}
